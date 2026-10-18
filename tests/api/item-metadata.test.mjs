import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, createUser, api } from '../support/server.mjs';

let server;
let anna;
let ben;

before(async () => {
  server = await startServer();
  anna = await createUser(server, 'Anna');
  ben = await createUser(server, 'Ben');
});
after(() => server?.stop());

const ITEMS = '/api/collections/items/records';

const createItem = (user, body) => api(server.url, ITEMS, { method: 'POST', token: user.token, body });
const updateItem = (user, id, body) => api(server.url, `${ITEMS}/${id}`, { method: 'PATCH', token: user.token, body });
const getItem = (id) => api(server.url, `${ITEMS}/${id}`, { token: server.superuserToken });

test('given Anna creates an item claiming Ben as author, then Anna is stored as creator and last editor', async () => {
  const res = await createItem(anna, { text: 'Brot', createdBy: ben.id, updatedBy: ben.id });
  assert.equal(res.status, 200);
  assert.equal(res.body.createdBy, anna.id);
  assert.equal(res.body.updatedBy, anna.id);
});

test('given Anna created an item, when Ben checks it off claiming Anna, then Anna stays creator and Ben is last editor', async () => {
  const item = (await createItem(anna, { text: 'Milch' })).body;
  const res = await updateItem(ben, item.id, { checked: true, createdBy: ben.id, updatedBy: anna.id });
  assert.equal(res.status, 200);
  assert.equal(res.body.createdBy, anna.id);
  assert.equal(res.body.updatedBy, ben.id);
});

test('given an open item, when it is checked off, then checkedAt is set to now', async () => {
  const item = (await createItem(anna, { text: 'Käse' })).body;
  assert.equal(item.checkedAt, '');
  const before = Date.now();
  const res = await updateItem(anna, item.id, { checked: true, checkedAt: '2000-01-01 00:00:00.000Z' });
  const checkedAt = Date.parse(res.body.checkedAt);
  assert.ok(checkedAt >= before - 1000 && checkedAt <= Date.now() + 1000, `checkedAt ${res.body.checkedAt} is not now`);
});

test('given a checked item, when it is checked off again, then checkedAt keeps its original time', async () => {
  const item = (await createItem(anna, { text: 'Eier' })).body;
  const first = (await updateItem(anna, item.id, { checked: true })).body.checkedAt;
  await new Promise((r) => setTimeout(r, 20));
  const second = (await updateItem(ben, item.id, { checked: true })).body.checkedAt;
  assert.equal(second, first);
});

test('given a checked item, when it is un-checked, then checkedAt is cleared', async () => {
  const item = (await createItem(anna, { text: 'Butter' })).body;
  await updateItem(anna, item.id, { checked: true });
  const res = await updateItem(anna, item.id, { checked: false });
  assert.equal(res.body.checked, false);
  assert.equal(res.body.checkedAt, '');
});

test('given an item created as checked, then checkedAt is set', async () => {
  const res = await createItem(anna, { text: 'Zucker', checked: true });
  assert.notEqual(res.body.checkedAt, '');
});

test('given text with surrounding whitespace, when creating an item, then the text is trimmed', async () => {
  const res = await createItem(anna, { text: '  Äpfel  ' });
  assert.equal(res.status, 200);
  assert.equal(res.body.text, 'Äpfel');
});

test('given whitespace-only text, when creating an item, then it is refused', async () => {
  const res = await createItem(anna, { text: '   ' });
  assert.equal(res.status, 400);
});

test('given text with surrounding whitespace, when changing an item, then the text is trimmed', async () => {
  const item = (await createItem(anna, { text: 'Käse' })).body;
  const res = await updateItem(anna, item.id, { text: ' Bergkäse ' });
  assert.equal(res.status, 200);
  assert.equal(res.body.text, 'Bergkäse');
});

test('given whitespace-only text, when changing an item, then it is refused and the text is unchanged', async () => {
  const item = (await createItem(anna, { text: 'Honig' })).body;
  const res = await updateItem(anna, item.id, { text: '   ' });
  assert.equal(res.status, 400);
  assert.equal((await getItem(item.id)).body.text, 'Honig');
});

test('given Anna created an item, when Ben changes its text claiming Anna, then Anna stays creator and Ben is last editor', async () => {
  const item = (await createItem(anna, { text: 'Brot' })).body;
  const res = await updateItem(ben, item.id, { text: 'Vollkornbrot', createdBy: ben.id, updatedBy: anna.id });
  assert.equal(res.status, 200);
  assert.equal(res.body.createdBy, anna.id);
  assert.equal(res.body.updatedBy, ben.id);
});

test('given the superuser, when it sets checkedAt, then the value is kept', async () => {
  const item = (await createItem(anna, { text: 'Mehl' })).body;
  const res = await api(server.url, `${ITEMS}/${item.id}`, {
    method: 'PATCH',
    token: server.superuserToken,
    body: { checked: true, checkedAt: '2000-01-01 00:00:00.000Z' },
  });
  assert.equal(res.body.checkedAt, '2000-01-01 00:00:00.000Z');
});

test('given an item by Carla, when the administrator deletes Carla, then the item stays with no creator', async () => {
  const carla = await createUser(server, 'Carla');
  const item = (await createItem(carla, { text: 'Salz' })).body;
  const del = await api(server.url, `/api/collections/users/records/${carla.id}`, {
    method: 'DELETE',
    token: server.superuserToken,
  });
  assert.equal(del.status, 204);
  const res = await getItem(item.id);
  assert.equal(res.status, 200);
  assert.equal(res.body.createdBy, '');
});

// Claims: the client sends any non-empty claimedBy to claim and '' to release;
// the server always records the requester.

const isNow = (date, before) => {
  const ms = Date.parse(date);
  return ms >= before - 1000 && ms <= Date.now() + 1000;
};

test('given an open item, when Anna claims it, then Anna is stored as claimant with the current time', async () => {
  const item = (await createItem(anna, { text: 'Milch' })).body;
  const before = Date.now();
  const res = await updateItem(anna, item.id, { claimedBy: anna.id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.claimedBy, anna.id);
  assert.ok(isNow(res.body.claimedAt, before), `claimedAt ${res.body.claimedAt} is not now`);
});

test('given an open item, when Ben claims it naming Anna, then Ben is stored as claimant', async () => {
  const item = (await createItem(anna, { text: 'Milch' })).body;
  const res = await updateItem(ben, item.id, { claimedBy: anna.id, claimedAt: '2000-01-01 00:00:00.000Z' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.claimedBy, ben.id);
  assert.notEqual(res.body.claimedAt, '2000-01-01 00:00:00.000Z');
});

test('given an item claimed by Anna, when Ben releases it, then the claim is cleared and Ben is last editor', async () => {
  const item = (await createItem(anna, { text: 'Brot' })).body;
  await updateItem(anna, item.id, { claimedBy: anna.id });
  const res = await updateItem(ben, item.id, { claimedBy: '' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.claimedBy, '');
  assert.equal(res.body.claimedAt, '');
  assert.equal(res.body.createdBy, anna.id);
  assert.equal(res.body.updatedBy, ben.id);
});

test('given an open item, when Ben claims it, then Ben is last editor', async () => {
  const item = (await createItem(anna, { text: 'Brot' })).body;
  const res = await updateItem(ben, item.id, { claimedBy: ben.id });
  assert.equal(res.body.updatedBy, ben.id);
});

test('given an item claimed by Anna, when Anna claims it again, then claimedAt keeps its original time', async () => {
  const item = (await createItem(anna, { text: 'Eier' })).body;
  const first = (await updateItem(anna, item.id, { claimedBy: anna.id })).body.claimedAt;
  await new Promise((r) => setTimeout(r, 20));
  const second = (await updateItem(anna, item.id, { claimedBy: anna.id })).body.claimedAt;
  assert.equal(second, first);
});

test('given an item claimed by Anna, when Ben claims it, then Ben is stored as claimant', async () => {
  const item = (await createItem(anna, { text: 'Eier' })).body;
  await updateItem(anna, item.id, { claimedBy: anna.id });
  const res = await updateItem(ben, item.id, { claimedBy: ben.id });
  assert.equal(res.body.claimedBy, ben.id);
});

test('given an item claimed by Anna, when Ben updates only its text, then the claim is kept', async () => {
  const item = (await createItem(anna, { text: 'Käse' })).body;
  const claimedAt = (await updateItem(anna, item.id, { claimedBy: anna.id })).body.claimedAt;
  const res = await updateItem(ben, item.id, { text: 'Bergkäse' });
  assert.equal(res.body.claimedBy, anna.id);
  assert.equal(res.body.claimedAt, claimedAt);
});

test('given a checked item, when Anna claims it, then it stays checked and unclaimed', async () => {
  const item = (await createItem(anna, { text: 'Butter', checked: true })).body;
  const res = await updateItem(anna, item.id, { claimedBy: anna.id });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.checked, true);
  assert.equal(res.body.claimedBy, '');
  assert.equal(res.body.claimedAt, '');
});

test('given an item claimed by Anna, when Ben checks it off, then the claim is cleared', async () => {
  const item = (await createItem(anna, { text: 'Butter' })).body;
  await updateItem(anna, item.id, { claimedBy: anna.id });
  const res = await updateItem(ben, item.id, { checked: true });
  assert.equal(res.body.checked, true);
  assert.equal(res.body.claimedBy, '');
  assert.equal(res.body.claimedAt, '');
});

test('given a claimed item that was checked off, when it is un-checked, then it stays unclaimed', async () => {
  const item = (await createItem(anna, { text: 'Butter' })).body;
  await updateItem(anna, item.id, { claimedBy: anna.id });
  await updateItem(ben, item.id, { checked: true });
  const res = await updateItem(ben, item.id, { checked: false });
  assert.equal(res.body.checked, false);
  assert.equal(res.body.claimedBy, '');
});

test('given Anna creates an item naming a claimant, then the item is unclaimed', async () => {
  const res = await createItem(anna, { text: 'Zucker', claimedBy: ben.id, claimedAt: '2000-01-01 00:00:00.000Z' });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.claimedBy, '');
  assert.equal(res.body.claimedAt, '');
});

test('given an item claimed by Dora, when the administrator deletes Dora, then the item stays unclaimed', async () => {
  const dora = await createUser(server, 'Dora');
  const item = (await createItem(anna, { text: 'Pfeffer' })).body;
  await updateItem(dora, item.id, { claimedBy: dora.id });
  const del = await api(server.url, `/api/collections/users/records/${dora.id}`, {
    method: 'DELETE',
    token: server.superuserToken,
  });
  assert.equal(del.status, 204);
  const res = await getItem(item.id);
  assert.equal(res.status, 200);
  assert.equal(res.body.claimedBy, '');
});
