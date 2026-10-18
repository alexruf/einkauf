import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../../pb_public/js/sync.js';
import { createOutbox } from '../../pb_public/js/outbox.js';
import { createStore } from '../../pb_public/js/storage.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

// Mimics the SDK's ClientResponseError, which carries the HTTP status and
// uses 0 for network failures.
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

// A fake PocketBase client backed by a map of items. `failures` maps a call
// such as "update:milch" to the error that call throws, once.
function fakePb({ items = [], users = [], failures = {} } = {}) {
  const server = new Map(items.map((i) => [i.id, { ...i }]));
  const calls = [];
  const updates = [];
  const fail = (key) => {
    const error = failures[key];
    if (error) {
      delete failures[key];
      throw error;
    }
  };
  const collections = {
    items: {
      async create(data) {
        calls.push(['create', data.id]);
        fail(`create:${data.id}`);
        if (server.has(data.id)) throw httpError(400);
        const record = { checked: false, checkedAt: '', created: '2026-10-17 10:00:00.000Z', createdBy: 'anna', updatedBy: 'anna', ...data };
        server.set(data.id, record);
        return record;
      },
      async update(id, data) {
        calls.push(['update', id, data.checked]);
        updates.push([id, data]);
        fail(`update:${id}`);
        if (!server.has(id)) throw httpError(404);
        Object.assign(server.get(id), data);
        return server.get(id);
      },
      async getOne(id) {
        calls.push(['getOne', id]);
        fail(`getOne:${id}`);
        if (!server.has(id)) throw httpError(404);
        return server.get(id);
      },
      async getFullList() {
        calls.push(['listItems']);
        fail('listItems');
        return [...server.values()];
      },
    },
    users: {
      async getFullList() {
        calls.push(['listUsers']);
        return users;
      },
    },
  };
  const authStore = { record: { id: 'anna', collectionName: 'users' } };
  return { pb: { collection: (name) => collections[name], authStore }, server, calls, updates };
}

function setup(pbOptions, { now } = {}) {
  const fake = fakePb(pbOptions);
  const store = createStore(new MemoryStorage());
  store.claim('anna');
  const outbox = createOutbox(store);
  const events = { offline: 0, auth: 0, rejected: [] };
  const sync = createSync({
    pb: fake.pb,
    store,
    outbox,
    onOffline: () => events.offline++,
    onAuthError: () => events.auth++,
    onRejected: (op) => events.rejected.push(op),
    now,
  });
  return { ...fake, store, outbox, sync, events };
}

const sentCalls = (calls) => calls.filter(([name]) => name === 'create' || name === 'update');

test('given pending changes, when flushing, then they are sent in order and leave the outbox', async () => {
  const { sync, outbox, calls } = setup({ items: [{ id: 'milch', text: 'Milch' }] });
  outbox.add({ type: 'create', id: 'eier', text: 'Eier' });
  outbox.add({ type: 'setChecked', id: 'milch', checked: true });
  outbox.add({ type: 'setChecked', id: 'eier', checked: true });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(sentCalls(calls), [
    ['create', 'eier'],
    ['update', 'milch', true],
    ['update', 'eier', true],
  ]);
  assert.deepEqual(outbox.list(), []);
});

test('given a network error, when flushing, then it stops, keeps the remaining changes and reports offline', async () => {
  const { sync, outbox, calls, events } = setup({ failures: { 'create:b': httpError(0) } });
  outbox.add({ type: 'create', id: 'a', text: 'A' });
  outbox.add({ type: 'create', id: 'b', text: 'B' });
  outbox.add({ type: 'create', id: 'c', text: 'C' });

  assert.equal(await sync.flush(), 'offline');
  assert.deepEqual(outbox.list().map((op) => op.id), ['b', 'c']);
  assert.deepEqual(sentCalls(calls).map(([, id]) => id), ['a', 'b']);
  assert.equal(events.offline, 1);
  assert.ok(!calls.some(([name]) => name === 'listItems'), 'no reload while offline');
});

test('given an expired session, when flushing, then it stops, keeps the changes and asks for login', async () => {
  const { sync, outbox, events } = setup({ failures: { 'create:a': httpError(401) } });
  outbox.add({ type: 'create', id: 'a', text: 'A' });
  outbox.add({ type: 'create', id: 'b', text: 'B' });

  assert.equal(await sync.flush(), 'auth');
  assert.deepEqual(outbox.list().map((op) => op.id), ['a', 'b']);
  assert.equal(events.auth, 1);
});

test('given a check-off of an item deleted on the server, when flushing, then it is dropped and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({ items: [{ id: 'brot', text: 'Brot' }] });
  outbox.add({ type: 'setChecked', id: 'milch', checked: true });
  outbox.add({ type: 'setChecked', id: 'brot', checked: true });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(outbox.list(), []);
  assert.equal(server.get('brot').checked, true);
  assert.deepEqual(events.rejected, []);
});

test('given a create that already reached the server, when flushing again, then it counts as done', async () => {
  const { sync, outbox, server, events } = setup({ items: [{ id: 'eier', text: 'Eier' }] });
  outbox.add({ type: 'create', id: 'eier', text: 'Eier' });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(outbox.list(), []);
  assert.equal(server.size, 1);
  assert.deepEqual(events.rejected, []);
});

test('given a create the server refuses, when flushing, then it is dropped with a notice and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({ failures: { 'create:bad': httpError(400) } });
  outbox.add({ type: 'create', id: 'bad', text: 'x'.repeat(201) });
  outbox.add({ type: 'create', id: 'ok', text: 'OK' });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(outbox.list(), []);
  assert.deepEqual(events.rejected.map((op) => op.id), ['bad']);
  assert.equal(server.has('ok'), true);
});

test('given another client error, when flushing, then the change is dropped with a notice and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({
    items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    failures: { 'update:a': httpError(422) },
  });
  outbox.add({ type: 'setChecked', id: 'a', checked: true });
  outbox.add({ type: 'setChecked', id: 'b', checked: true });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(events.rejected.map((op) => op.id), ['a']);
  assert.equal(server.get('b').checked, true);
});

test('given a pending text change, when flushing, then only the text is sent and stored', async () => {
  const { sync, outbox, server, updates } = setup({ items: [{ id: 'milch', text: 'Milch', checked: true }] });
  outbox.add({ type: 'setText', id: 'milch', text: 'Hafermilch' });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(updates, [['milch', { text: 'Hafermilch' }]]);
  assert.equal(server.get('milch').text, 'Hafermilch');
  assert.equal(server.get('milch').checked, true);
  assert.deepEqual(outbox.list(), []);
});

test('given a text change of an item deleted on the server, when flushing, then it is dropped and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({ items: [{ id: 'brot', text: 'Brot' }] });
  outbox.add({ type: 'setText', id: 'milch', text: 'Hafermilch' });
  outbox.add({ type: 'setText', id: 'brot', text: 'Vollkornbrot' });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(outbox.list(), []);
  assert.equal(server.get('brot').text, 'Vollkornbrot');
  assert.deepEqual(events.rejected, []);
});

test('given a text change the server refuses, when flushing, then it is dropped with a notice and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({
    items: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    failures: { 'update:a': httpError(400) },
  });
  outbox.add({ type: 'setText', id: 'a', text: 'x'.repeat(201) });
  outbox.add({ type: 'setText', id: 'b', text: 'B2' });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(events.rejected.map((op) => op.id), ['a']);
  assert.equal(server.get('a').text, 'A');
  assert.equal(server.get('b').text, 'B2');
});

test('given a pending claim, when flushing, then the logged-in user is sent as claimant', async () => {
  const { sync, outbox, updates } = setup({ items: [{ id: 'milch', text: 'Milch' }] });
  outbox.add({ type: 'setClaimed', id: 'milch', claimed: true });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(updates, [['milch', { claimedBy: 'anna' }]]);
  assert.deepEqual(outbox.list(), []);
});

test('given a pending release, when flushing, then an empty claimant is sent', async () => {
  const { sync, outbox, updates } = setup({ items: [{ id: 'milch', text: 'Milch', claimedBy: 'ben' }] });
  outbox.add({ type: 'setClaimed', id: 'milch', claimed: false });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(updates, [['milch', { claimedBy: '' }]]);
});

test('given a claim of an item deleted on the server, when flushing, then it is dropped and the rest is sent', async () => {
  const { sync, outbox, server, events } = setup({ items: [{ id: 'brot', text: 'Brot' }] });
  outbox.add({ type: 'setClaimed', id: 'milch', claimed: true });
  outbox.add({ type: 'setClaimed', id: 'brot', claimed: true });

  assert.equal(await sync.flush(), 'done');
  assert.deepEqual(outbox.list(), []);
  assert.equal(server.get('brot').claimedBy, 'anna');
  assert.deepEqual(events.rejected, []);
});

test('given claimed items on the server, when reloading, then the claim fields are kept in the snapshot', async () => {
  const { sync, store } = setup({
    items: [{ id: 'milch', text: 'Milch', claimedBy: 'ben', claimedAt: '2026-10-18 10:00:00.000Z' }],
  });

  await sync.flush();
  const [item] = store.get('snapshot').items;
  assert.equal(item.claimedBy, 'ben');
  assert.equal(item.claimedAt, '2026-10-18 10:00:00.000Z');
});

test('given the server is busy, when flushing, then it stops and keeps the change for later', async () => {
  const { sync, outbox, events } = setup({ failures: { 'create:a': httpError(429) } });
  outbox.add({ type: 'create', id: 'a', text: 'A' });

  assert.equal(await sync.flush(), 'retry');
  assert.deepEqual(outbox.list().map((op) => op.id), ['a']);
  assert.deepEqual(events.rejected, []);
});

test('given a successful flush, then items and user names are reloaded into the snapshot', async () => {
  const { sync, outbox, store } = setup({
    items: [{ id: 'milch', text: 'Milch', extra: 'ignored' }],
    users: [{ id: 'anna', name: 'Anna', email: 'should-not-be-stored' }],
  });
  outbox.add({ type: 'create', id: 'eier', text: 'Eier' });

  await sync.flush();
  const snapshot = store.get('snapshot');
  assert.deepEqual(snapshot.items.map((i) => i.id).sort(), ['eier', 'milch']);
  assert.equal(snapshot.items[0].extra, undefined);
  assert.deepEqual(snapshot.users, [{ id: 'anna', name: 'Anna' }]);
});

test('given a flush in progress, when another flush is requested, then the new change is sent too', async () => {
  const { sync, outbox, server } = setup();
  outbox.add({ type: 'create', id: 'a', text: 'A' });
  const first = sync.flush();
  outbox.add({ type: 'create', id: 'b', text: 'B' });
  const second = sync.flush();

  assert.equal(await first, 'done');
  assert.equal(await second, 'done');
  assert.deepEqual([...server.keys()].sort(), ['a', 'b']);
  assert.deepEqual(outbox.list(), []);
});

test('given realtime events, when applied, then the snapshot follows creates, updates and deletes', () => {
  const { sync, store } = setup();
  store.set('snapshot', { items: [{ id: 'milch', text: 'Milch', checked: false }], users: [] });

  sync.applyEvent({ action: 'create', record: { id: 'brot', text: 'Brot', checked: false } });
  sync.applyEvent({ action: 'update', record: { id: 'milch', text: 'Milch', checked: true } });
  sync.applyEvent({ action: 'delete', record: { id: 'brot' } });

  const items = store.get('snapshot').items;
  assert.deepEqual(items.map((i) => [i.id, i.checked]), [['milch', true]]);
});

test('given a realtime event during a reload, when the older reload result arrives, then the event is not lost', async () => {
  const { sync, outbox, store, pb } = setup({ items: [{ id: 'milch', text: 'Milch', checked: false }] });
  store.set('snapshot', { items: [], users: [] });
  const items = pb.collection('items');
  const original = items.getFullList;
  // The reload reads the list before Ben's item exists; the event for that
  // item arrives while the response is still on its way.
  items.getFullList = async (...args) => {
    const result = await original(...args);
    sync.applyEvent({ action: 'create', record: { id: 'eier', text: 'Eier', checked: false } });
    sync.applyEvent({ action: 'update', record: { id: 'milch', text: 'Milch', checked: true } });
    return result;
  };
  outbox.add({ type: 'setChecked', id: 'milch', checked: false });

  await sync.flush();
  const byId = new Map(store.get('snapshot').items.map((i) => [i.id, i]));
  assert.equal(byId.get('eier')?.text, 'Eier');
  assert.equal(byId.get('milch').checked, true);
});

test('given a successful flush, then the time of the sync is remembered', async () => {
  const { sync, store } = setup({}, { now: () => '2026-10-18T12:00:00.000Z' });
  await sync.flush();
  assert.equal(store.get('lastSync'), '2026-10-18T12:00:00.000Z');
});

test('given a flush that ends offline, then the previous sync time is kept', async () => {
  const { sync, store } = setup({ failures: { listItems: httpError(0) } }, { now: () => '2026-10-18T12:00:00.000Z' });
  store.set('lastSync', '2026-10-17T08:00:00.000Z');
  await sync.flush();
  assert.equal(store.get('lastSync'), '2026-10-17T08:00:00.000Z');
});

test('given the app knows the list is current, when marking it synced, then the current time is remembered', () => {
  const { sync, store } = setup({}, { now: () => '2026-10-18T13:30:00.000Z' });
  sync.markSynced();
  assert.equal(store.get('lastSync'), '2026-10-18T13:30:00.000Z');
});
