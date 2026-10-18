import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { api, createUser, startServer } from '../support/server.mjs';

let server;
let anna;

before(async () => {
  server = await startServer();
  anna = await createUser(server, 'Anna');
});
after(() => server?.stop());

const ITEMS = '/api/collections/items/records';

const createItem = (body, token = anna.token) => api(server.url, ITEMS, { method: 'POST', token, body });
const getItem = (id) => api(server.url, `${ITEMS}/${id}`, { token: server.superuserToken });

// 15 lowercase alphanumeric characters, the default PocketBase id pattern.
const clientId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.slice(0, 15).padEnd(15, '0');

test('given a family member, when creating an item with valid text, then it is stored unchecked', async () => {
  const res = await createItem({ text: 'Milch' });
  assert.equal(res.status, 200);
  assert.equal(res.body.text, 'Milch');
  assert.equal(res.body.checked, false);
});

test('given a family member, when creating an item with empty text, then it is refused', async () => {
  const res = await createItem({ text: '' });
  assert.equal(res.status, 400);
  assert.ok(res.body.data.text);
});

test('given a family member, when creating an item with 200 characters, then it is stored', async () => {
  const res = await createItem({ text: 'x'.repeat(200) });
  assert.equal(res.status, 200);
});

test('given a family member, when creating an item with 201 characters, then it is refused', async () => {
  const res = await createItem({ text: 'x'.repeat(201) });
  assert.equal(res.status, 400);
  assert.ok(res.body.data.text);
});

const updateItem = (id, body) => api(server.url, `${ITEMS}/${id}`, { method: 'PATCH', token: anna.token, body });

test('given an item, when a family member changes its text, then the new text is stored', async () => {
  const item = (await createItem({ text: 'Brot' })).body;
  const res = await updateItem(item.id, { text: 'Kuchen' });
  assert.equal(res.status, 200);
  assert.equal((await getItem(item.id)).body.text, 'Kuchen');
});

test('given an item, when a family member sends checked together with text, then both are stored', async () => {
  const item = (await createItem({ text: 'Käse' })).body;
  const res = await updateItem(item.id, { checked: true, text: 'Bergkäse' });
  assert.equal(res.status, 200);
  const stored = (await getItem(item.id)).body;
  assert.equal(stored.checked, true);
  assert.equal(stored.text, 'Bergkäse');
});

test('given a checked item, when a family member changes only its text, then it stays checked', async () => {
  const item = (await createItem({ text: 'Quark', checked: true })).body;
  const res = await updateItem(item.id, { text: 'Magerquark' });
  assert.equal(res.status, 200);
  assert.equal((await getItem(item.id)).body.checked, true);
});

test('given an item, when a family member changes its text to 201 characters, then it is refused and the text is unchanged', async () => {
  const item = (await createItem({ text: 'Senf' })).body;
  const res = await updateItem(item.id, { text: 'x'.repeat(201) });
  assert.equal(res.status, 400);
  assert.equal((await getItem(item.id)).body.text, 'Senf');
});

test('given an item, when a family member checks it off, then it is checked', async () => {
  const item = (await createItem({ text: 'Butter' })).body;
  const res = await api(server.url, `${ITEMS}/${item.id}`, {
    method: 'PATCH',
    token: anna.token,
    body: { checked: true },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.checked, true);
});

test('given an item, when a family member deletes it, then it is gone', async () => {
  const item = (await createItem({ text: 'Eier' })).body;
  const res = await api(server.url, `${ITEMS}/${item.id}`, { method: 'DELETE', token: anna.token });
  assert.equal(res.status, 204);
  assert.equal((await getItem(item.id)).status, 404);
});

test('given a client-supplied id, when creating an item, then the item has that id', async () => {
  const id = clientId();
  const res = await createItem({ id, text: 'Äpfel' });
  assert.equal(res.status, 200);
  assert.equal(res.body.id, id);
});

test('given an existing id, when creating another item with it, then it is refused and the first stays', async () => {
  const id = clientId();
  assert.equal((await createItem({ id, text: 'Zucker' })).status, 200);
  const res = await createItem({ id, text: 'Salz' });
  assert.equal(res.status, 400);
  assert.equal((await getItem(id)).body.text, 'Zucker');
});
