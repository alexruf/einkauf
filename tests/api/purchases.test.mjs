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

const PURCHASES = '/api/collections/purchases/records';

const now = () => new Date().toISOString().replace('T', ' ');

async function createPurchase(text, fields = {}) {
  const body = { key: text.toLowerCase(), text, count: 1, lastAt: now(), ...fields };
  const res = await api(server.url, PURCHASES, { method: 'POST', token: server.superuserToken, body });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

const ITEMS = '/api/collections/items/records';

const createItem = (text) => api(server.url, ITEMS, { method: 'POST', token: anna.token, body: { text } });
const updateItem = (id, body, token = anna.token) =>
  api(server.url, `${ITEMS}/${id}`, { method: 'PATCH', token, body });

// The purchase stored for a text, found by its normalized key, or null.
async function findPurchase(key) {
  const filter = encodeURIComponent(`key = "${key}"`);
  const res = await api(server.url, `${PURCHASES}?filter=${filter}`, { token: server.superuserToken });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.items[0] ?? null;
}

async function addAndCheck(text) {
  const item = (await createItem(text)).body;
  const res = await updateItem(item.id, { checked: true });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return item;
}

test('given a text never bought, when a family member checks it off, then a purchase with count 1 exists', async () => {
  await addAndCheck('Erstkauf');
  const purchase = await findPurchase('erstkauf');
  assert.equal(purchase?.text, 'Erstkauf');
  assert.equal(purchase.count, 1);
  assert.ok(purchase.lastAt);
});

test('given a purchase, when the same text is checked off in another spelling, then the count rises and the new spelling is shown', async () => {
  await addAndCheck('Zweitkauf');
  await addAndCheck('zweitkauf ');
  const purchase = await findPurchase('zweitkauf');
  assert.equal(purchase.count, 2);
  assert.equal(purchase.text, 'zweitkauf');
});

test('given texts with repeated inner spaces, when checked off, then they count as the same purchase', async () => {
  await addAndCheck('Grüne  Bohnen');
  await addAndCheck('grüne bohnen');
  assert.equal((await findPurchase('grüne bohnen')).count, 2);
});

test('given an item added and edited without check-off, then no purchase is counted', async () => {
  const item = (await createItem('Nur Notiert')).body;
  await updateItem(item.id, { text: 'Nur Notiert 2x' });
  await updateItem(item.id, { claimedBy: anna.id });
  assert.equal(await findPurchase('nur notiert'), null);
  assert.equal(await findPurchase('nur notiert 2x'), null);
});

test('given an edited item, when it is checked off, then the new text is counted and the old one is not', async () => {
  const item = (await createItem('Umbenannt')).body;
  await updateItem(item.id, { text: 'Umbenannt 2x' });
  await updateItem(item.id, { checked: true });
  assert.equal((await findPurchase('umbenannt 2x')).count, 1);
  assert.equal(await findPurchase('umbenannt'), null);
});

test('given a check-off, when the same check-off arrives again, then it counts once', async () => {
  const item = await addAndCheck('Doppelt Gesendet');
  const res = await updateItem(item.id, { checked: true });
  assert.equal(res.status, 200);
  assert.equal((await findPurchase('doppelt gesendet')).count, 1);
});

test('given a mistaken first check-off, when it is un-checked, then no purchase remains', async () => {
  const item = await addAndCheck('Mlich');
  await updateItem(item.id, { checked: false });
  assert.equal(await findPurchase('mlich'), null);
});

test('given a frequent purchase, when the current check-off is un-checked, then the count drops by one', async () => {
  await addAndCheck('Oft Gekauft');
  await addAndCheck('Oft Gekauft');
  const item = await addAndCheck('Oft Gekauft');
  await updateItem(item.id, { checked: false });
  assert.equal((await findPurchase('oft gekauft')).count, 2);
});

test('given a checked item edited to a text without purchase, when it is un-checked, then no purchase changes', async () => {
  const item = await addAndCheck('Vorher');
  await updateItem(item.id, { text: 'Nachher' });
  const res = await updateItem(item.id, { checked: false });
  assert.equal(res.status, 200);
  assert.equal((await findPurchase('vorher')).count, 1);
  assert.equal(await findPurchase('nachher'), null);
});

test('given a superuser, when checking off an item, then no purchase is counted', async () => {
  const item = (await createItem('Vom Admin')).body;
  const res = await updateItem(item.id, { checked: true }, server.superuserToken);
  assert.equal(res.status, 200);
  assert.equal(await findPurchase('vom admin'), null);
});

test('given purchases, when a family member lists them, then the request succeeds', async () => {
  await createPurchase('Lesbar');
  const res = await api(server.url, `${PURCHASES}?perPage=500`, { token: anna.token });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.items.some((p) => p.text === 'Lesbar'));
});

test('given purchases, when a client without a login lists them, then it receives none', async () => {
  await createPurchase('Geheim');
  const res = await api(server.url, PURCHASES);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.items, []);
});

test('given a family member, when creating a purchase through the API, then it is refused', async () => {
  const res = await api(server.url, PURCHASES, {
    method: 'POST',
    token: anna.token,
    body: { key: 'gefälscht', text: 'Gefälscht', count: 99, lastAt: now() },
  });
  assert.notEqual(res.status, 200);
});

test('given a purchase, when a family member changes or deletes it through the API, then it is refused and unchanged', async () => {
  const purchase = await createPurchase('Fest', { count: 3 });
  const path = `${PURCHASES}/${purchase.id}`;

  const update = await api(server.url, path, { method: 'PATCH', token: anna.token, body: { count: 99 } });
  assert.notEqual(update.status, 200);
  const del = await api(server.url, path, { method: 'DELETE', token: anna.token });
  assert.notEqual(del.status, 204);

  const stored = await api(server.url, path, { token: server.superuserToken });
  assert.equal(stored.status, 200);
  assert.equal(stored.body.count, 3);
});
