import { startServer, createUser } from './server.mjs';

// One server for the whole browser test run. The tests reach it and the
// test users through the environment, which Playwright passes on to workers.
export default async function globalSetup() {
  const server = await startServer();
  try {
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
