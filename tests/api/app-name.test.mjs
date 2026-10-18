import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { api, startServer } from '../support/server.mjs';

let server;
before(async () => {
  server = await startServer();
});
after(() => server?.stop());

test('given a fresh installation, when reading the settings, then the application name is "Einkauf"', async () => {
  const res = await api(server.url, '/api/settings', { token: server.superuserToken });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.meta.appName, 'Einkauf');
});

test('given no session, when requesting the app name, then only the name is returned', async () => {
  const res = await api(server.url, '/api/einkauf/app-name');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body, { name: 'Einkauf' });
});

test('given an admin renamed the app, when requesting the app name, then the new name is returned', async () => {
  const update = await api(server.url, '/api/settings', {
    method: 'PATCH',
    token: server.superuserToken,
    body: { meta: { appName: 'Familieneinkauf' } },
  });
  assert.equal(update.status, 200, JSON.stringify(update.body));

  const res = await api(server.url, '/api/einkauf/app-name');
  assert.deepEqual(res.body, { name: 'Familieneinkauf' });
});
