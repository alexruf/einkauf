import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, createUser, api, PASSWORD } from '../support/server.mjs';
import { connectRealtime } from '../support/realtime.mjs';

let server;
let anna;
let ben;

before(async () => {
  server = await startServer();
  anna = await createUser(server, 'Anna');
  ben = await createUser(server, 'Ben');
});
after(() => server?.stop());

const newAccount = (name) => ({
  email: `${name.toLowerCase() || 'empty'}-${Date.now()}@example.test`,
  name,
  password: PASSWORD,
  passwordConfirm: PASSWORD,
});

async function userCount() {
  const res = await api(server.url, '/api/collections/users/records?perPage=1', { token: server.superuserToken });
  return res.body.totalItems;
}

test('given no session, when a client registers an account, then it is refused', async () => {
  const before = await userCount();
  const res = await api(server.url, '/api/collections/users/records', { method: 'POST', body: newAccount('Eve') });
  assert.equal(res.status, 403);
  assert.equal(await userCount(), before);
});

test('given a logged-in user, when they create another account, then it is refused', async () => {
  const before = await userCount();
  const res = await api(server.url, '/api/collections/users/records', {
    method: 'POST',
    token: anna.token,
    body: newAccount('Eve'),
  });
  assert.equal(res.status, 403);
  assert.equal(await userCount(), before);
});

test('given a logged-in user, when they delete their own account, then it is refused', async () => {
  const res = await api(server.url, `/api/collections/users/records/${ben.id}`, { method: 'DELETE', token: ben.token });
  assert.equal(res.status, 403);
  const check = await api(server.url, `/api/collections/users/records/${ben.id}`, { token: server.superuserToken });
  assert.equal(check.status, 200);
});

for (const [label, name] of [
  ['an empty', ''],
  ['a whitespace-only', '   '],
  ['a 31-character', 'x'.repeat(31)],
]) {
  test(`given the superuser, when saving an account with ${label} display name, then it is rejected`, async () => {
    const res = await api(server.url, '/api/collections/users/records', {
      method: 'POST',
      token: server.superuserToken,
      body: newAccount(name),
    });
    assert.equal(res.status, 400);
    assert.ok(res.body.data.name, `expected a validation error for name, got ${JSON.stringify(res.body)}`);
  });
}

test('given the superuser, when saving an account with a 30-character display name, then it is saved', async () => {
  const res = await api(server.url, '/api/collections/users/records', {
    method: 'POST',
    token: server.superuserToken,
    body: newAccount('x'.repeat(30)),
  });
  assert.equal(res.status, 200);
});

test('given a logged-in user, when listing users, then all ids and names are returned but no other email', async () => {
  const res = await api(server.url, '/api/collections/users/records?perPage=200', { token: anna.token });
  assert.equal(res.status, 200);
  const byId = new Map(res.body.items.map((u) => [u.id, u]));
  assert.equal(byId.get(anna.id)?.name, 'Anna');
  assert.equal(byId.get(ben.id)?.name, 'Ben');
  for (const user of res.body.items) {
    if (user.id === anna.id) continue;
    assert.ok(!user.email, `email of ${user.id} exposed: ${user.email}`);
  }
});

test('given no session, when listing items, then no items are returned', async () => {
  const created = await api(server.url, '/api/collections/items/records', {
    method: 'POST',
    token: anna.token,
    body: { text: 'Milch' },
  });
  assert.equal(created.status, 200);

  const res = await api(server.url, '/api/collections/items/records');
  assert.equal(res.body?.items?.length ?? 0, 0);
});

test('given no session, when subscribed to items and an item is added, then no event arrives', async () => {
  const anonymous = await connectRealtime(server.url);
  const member = await connectRealtime(server.url);
  try {
    await anonymous.subscribe(['items']);
    await member.subscribe(['items'], ben.token);

    const created = await api(server.url, '/api/collections/items/records', {
      method: 'POST',
      token: anna.token,
      body: { text: 'Brot' },
    });
    assert.equal(created.status, 200);

    // The authenticated subscriber proves the event was broadcast at all.
    await member.waitFor((e) => e.name === 'items' && e.data.record?.id === created.body.id);
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(
      anonymous.events.filter((e) => e.name === 'items'),
      [],
    );
  } finally {
    anonymous.close();
    member.close();
  }
});
