import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { after, before, beforeEach, test } from 'node:test';
import { connectRealtime } from '../support/realtime.mjs';
import { api, createUser, PASSWORD, SUPERUSER, startServer } from '../support/server.mjs';

let server;
let anna;
let ben;
// Real family accounts may stay unverified, which keeps verification mails possible.
let carla;

// Stands in for a mail server. Any connection means PocketBase tried to send
// an email; the connection is dropped right away, so nothing gets delivered.
let smtp;
let smtpConnections = 0;

before(async () => {
  smtp = createServer((socket) => {
    smtpConnections++;
    socket.destroy();
  });
  await new Promise((r) => smtp.listen(0, '127.0.0.1', r));

  server = await startServer();
  const settings = await api(server.url, '/api/settings', {
    method: 'PATCH',
    token: server.superuserToken,
    body: { smtp: { enabled: true, host: '127.0.0.1', port: smtp.address().port } },
  });
  assert.equal(settings.status, 200, `configuring SMTP failed: ${JSON.stringify(settings.body)}`);

  anna = await createUser(server, 'Anna');
  ben = await createUser(server, 'Ben');
  carla = await createUser(server, 'Carla', { verified: false });
});
after(async () => {
  await server?.stop();
  smtp?.close();
});
beforeEach(() => {
  smtpConnections = 0;
});

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

// Mails are sent in the background after the response, so wait a moment
// before concluding that none was sent.
async function assertNoEmailSent() {
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(smtpConnections, 0, 'PocketBase tried to send an email');
}

async function loginFrom(userAgent, user, collection = 'users') {
  const res = await fetch(`${server.url}/api/collections/${collection}/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': userAgent },
    body: JSON.stringify({ identity: user.email, password: user.password }),
  });
  assert.equal(res.status, 200, `login from ${userAgent} failed: ${await res.text()}`);
}

test('given a user who logged in before, when they log in from a new device, then no email is sent', async () => {
  await loginFrom('Laptop', anna);
  await loginFrom('Phone', anna);
  await assertNoEmailSent();
});

test('given a superuser who logged in before, when they log in from a new device, then no email is sent', async () => {
  await loginFrom('Laptop', SUPERUSER, '_superusers');
  await loginFrom('Phone', SUPERUSER, '_superusers');
  await assertNoEmailSent();
});

for (const action of ['request-password-reset', 'request-verification']) {
  test(`given no session, when a client calls ${action} for an unverified user, then no email is sent`, async () => {
    const res = await api(server.url, `/api/collections/users/${action}`, {
      method: 'POST',
      body: { email: carla.email },
    });
    assert.equal(res.status, 204);
    await assertNoEmailSent();
  });
}

test('given a logged-in user, when they request an email change, then it fails and no email is sent', async () => {
  const res = await api(server.url, '/api/collections/users/request-email-change', {
    method: 'POST',
    token: ben.token,
    body: { newEmail: `ben-new-${Date.now()}@example.test` },
  });
  assert.equal(res.status, 400);
  await assertNoEmailSent();
});
