import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { connectRealtime } from '../support/realtime.mjs';
import { api, createUser, startServer } from '../support/server.mjs';

let server;
let anna;

before(async () => {
  server = await startServer();
  anna = await createUser(server, 'Anna');
});
after(() => server?.stop());

const ITEMS = '/api/collections/items/records';
const HOUR = 3600 * 1000;

// PocketBase's date format: "2006-01-02 15:04:05.000Z".
const hoursAgo = (h) => new Date(Date.now() - h * HOUR).toISOString().replace('T', ' ');

async function createItem(text, fields = {}) {
  const res = await api(server.url, ITEMS, { method: 'POST', token: server.superuserToken, body: { text, ...fields } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

const exists = async (id) => (await api(server.url, `${ITEMS}/${id}`, { token: server.superuserToken })).status === 200;
const cleanup = (token) => api(server.url, '/api/einkauf/cleanup', { method: 'POST', token });

test('given items of different ages, when the cleanup runs, then only items checked off over 24 hours ago are deleted', async () => {
  const old = await createItem('Alt abgehakt', { checked: true, checkedAt: hoursAgo(25) });
  const recent = await createItem('Neu abgehakt', { checked: true, checkedAt: hoursAgo(1) });
  // Backdating `created` is not possible through the API, but an open item
  // has no checkedAt, which is what the cleanup looks at.
  const open = await createItem('Offen');

  const res = await cleanup(server.superuserToken);
  assert.equal(res.status, 200, JSON.stringify(res.body));

  assert.equal(await exists(old.id), false);
  assert.equal(await exists(recent.id), true);
  assert.equal(await exists(open.id), true);
});

test('given the hourly cron job, when it runs, then it deletes old checked-off items', async () => {
  const crons = await api(server.url, '/api/crons', { token: server.superuserToken });
  const job = crons.body.find((c) => c.id === 'einkauf_cleanup');
  assert.equal(job?.expression, '0 * * * *');

  const old = await createItem('Milch', { checked: true, checkedAt: hoursAgo(48) });
  const run = await api(server.url, '/api/crons/einkauf_cleanup', { method: 'POST', token: server.superuserToken });
  assert.equal(run.status, 204, JSON.stringify(run.body));
  // The job runs in the background; give it a moment.
  for (let i = 0; i < 20 && (await exists(old.id)); i++) await new Promise((r) => setTimeout(r, 50));
  assert.equal(await exists(old.id), false);
});

test('given no session, when calling the cleanup route, then it is refused', async () => {
  const res = await cleanup();
  assert.ok([401, 403].includes(res.status), `got ${res.status}`);
});

test('given a family member, when calling the cleanup route, then it is refused', async () => {
  const res = await cleanup(anna.token);
  assert.ok([401, 403].includes(res.status), `got ${res.status}`);
});

test('given a subscriber, when the cleanup deletes an item, then the subscriber receives a delete event', async () => {
  const old = await createItem('Brot', { checked: true, checkedAt: hoursAgo(30) });
  const client = await connectRealtime(server.url);
  try {
    await client.subscribe(['items'], anna.token);
    assert.equal((await cleanup(server.superuserToken)).status, 200);
    await client.waitFor((e) => e.name === 'items' && e.data.action === 'delete' && e.data.record?.id === old.id);
  } finally {
    client.close();
  }
});

const getItem = async (id) => (await api(server.url, `${ITEMS}/${id}`, { token: server.superuserToken })).body;

test('given claims of different ages, when the cleanup runs, then only claims older than 3 hours are released', async () => {
  const old = await createItem('Alt markiert', { claimedBy: anna.id, claimedAt: hoursAgo(3.5) });
  const recent = await createItem('Neu markiert', { claimedBy: anna.id, claimedAt: hoursAgo(2.5) });

  const res = await cleanup(server.superuserToken);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.released >= 1, `released ${res.body.released}`);

  const released = await getItem(old.id);
  assert.equal(released.claimedBy, '');
  assert.equal(released.claimedAt, '');
  assert.equal((await getItem(recent.id)).claimedBy, anna.id);
});

test('given an expired claim, when the cleanup releases it, then the last editor is unchanged', async () => {
  const ben = await createUser(server, 'Ben');
  const item = await createItem('Milch', { updatedBy: ben.id, claimedBy: anna.id, claimedAt: hoursAgo(5) });
  assert.equal((await cleanup(server.superuserToken)).status, 200);
  const stored = await getItem(item.id);
  assert.equal(stored.claimedBy, '');
  assert.equal(stored.updatedBy, ben.id);
});

test('given a subscriber, when the cleanup releases a claim, then the subscriber receives an update event', async () => {
  const item = await createItem('Eier', { claimedBy: anna.id, claimedAt: hoursAgo(4) });
  const client = await connectRealtime(server.url);
  try {
    await client.subscribe(['items'], anna.token);
    assert.equal((await cleanup(server.superuserToken)).status, 200);
    await client.waitFor(
      (e) =>
        e.name === 'items' &&
        e.data.action === 'update' &&
        e.data.record?.id === item.id &&
        e.data.record.claimedBy === '',
    );
  } finally {
    client.close();
  }
});
