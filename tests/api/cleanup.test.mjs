import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, createUser, api } from '../support/server.mjs';
import { connectRealtime } from '../support/realtime.mjs';

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
