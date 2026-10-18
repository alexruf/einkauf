import { startServer, createUser, api } from './server.mjs';

// One server for the whole browser test run. The tests reach it and the
// test users through the environment, which Playwright passes on to workers.
export default async function globalSetup() {
  const server = await startServer();
  try {
    await raiseApiRateLimit(server);
    const users = {
      anna: await createUser(server, 'Anna'),
      ben: await createUser(server, 'Ben'),
      carla: await createUser(server, 'Carla'),
    };
    process.env.EINKAUF_URL = server.url;
    process.env.EINKAUF_SUPERUSER_TOKEN = server.superuserToken;
    process.env.EINKAUF_USERS = JSON.stringify(users);
  } catch (err) {
    await server.stop();
    throw err;
  }
  return () => server.stop();
}

// All browser tests share this server and one client address, so together
// they exceed the general limit of 300 requests per 10 seconds that protects
// production. The tests then get 429 responses that a family never sees.
// Only that limit is raised; the login limit stays, because the login tests
// rely on it.
async function raiseApiRateLimit(server) {
  const res = await api(server.url, '/api/settings', {
    method: 'PATCH',
    token: server.superuserToken,
    body: {
      rateLimits: {
        enabled: true,
        rules: [
          { label: '*:auth', audience: '', duration: 60, maxRequests: 10 },
          { label: '/api/', audience: '', duration: 10, maxRequests: 3000 },
        ],
      },
    },
  });
  if (res.status !== 200) throw new Error(`Raising the test rate limit failed: ${JSON.stringify(res.body)}`);
}
