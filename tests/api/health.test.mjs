import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { api, startServer } from '../support/server.mjs';

let server;
before(async () => {
  server = await startServer();
});
after(() => server?.stop());

test('given a test server, when /api/health is requested, then it responds with 200', async () => {
  const res = await api(server.url, '/api/health');
  assert.equal(res.status, 200);
});
