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
