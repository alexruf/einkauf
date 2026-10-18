import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createUser, startServer } from '../support/server.mjs';

// Must match the *:auth rule in the rate limit migration.
const AUTH_LIMIT = 10;

let server;
let anna;

before(async () => {
  server = await startServer();
  anna = await createUser(server, 'Anna');
});
after(() => server?.stop());

// Each test uses its own client address, so the buckets don't interfere.
async function login(forwardedFor, password = 'wrong-password') {
  const res = await fetch(`${server.url}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor },
    body: JSON.stringify({ identity: anna.email, password }),
  });
  return res.status;
}

test('given a client that used up the login limit, when it tries again, then it gets 429', async () => {
  for (let i = 0; i < AUTH_LIMIT; i++) {
    assert.equal(await login('203.0.113.1'), 400, `attempt ${i + 1} should be a normal failed login`);
  }
  assert.equal(await login('203.0.113.1'), 429);
  assert.equal(await login('203.0.113.1', anna.password), 429, 'even the right password is refused');
});

test('given one client used up the login limit, when another client behind the proxy logs in, then it is not limited', async () => {
  for (let i = 0; i <= AUTH_LIMIT; i++) await login('203.0.113.2');
  assert.equal(await login('203.0.113.2'), 429);
  assert.equal(await login('203.0.113.3', anna.password), 200);
});

test('given a limited client, when it prepends a fake address to X-Forwarded-For, then it is still limited', async () => {
  for (let i = 0; i <= AUTH_LIMIT; i++) await login('203.0.113.4');
  // The proxy appends the real client address on the right; anything left of
  // it comes from the client and must not count.
  assert.equal(await login('198.51.100.7, 203.0.113.4', anna.password), 429);
});
