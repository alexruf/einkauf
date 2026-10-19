// Starts a throwaway PocketBase instance for tests. It uses the repository's
// migrations, hooks and frontend, but its own temporary data directory and a
// free port, so tests never touch pb_data/ or a running `make dev` server.

import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const repoRoot = resolve(import.meta.dirname, '../..');

export const SUPERUSER = { email: 'admin@example.test', password: 'admin-password-123' };
export const PASSWORD = 'test-password-123';

export const PUBLIC_DIR = join(repoRoot, 'pb_public');

function dirFlags(dataDir, publicDir) {
  return [
    `--dir=${dataDir}`,
    `--publicDir=${publicDir}`,
    `--hooksDir=${join(repoRoot, 'pb_hooks')}`,
    `--migrationsDir=${join(repoRoot, 'pb_migrations')}`,
    // Without this, schema changes made by tests would be written as new
    // migration files into the repository.
    '--automigrate=false',
  ];
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

async function waitForHealth(url, child, output) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`PocketBase exited with code ${child.exitCode}:\n${output.join('')}`);
    }
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // Not listening yet; retry until the deadline.
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`PocketBase did not become healthy at ${url}:\n${output.join('')}`);
}

// Sends a JSON request and returns { status, body }. Never throws on HTTP
// errors, because many tests assert on refused requests.
export async function api(url, path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${url}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed };
}

async function expectOk(promise, what) {
  const res = await promise;
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`${what} failed with ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// Creates a user as superuser and returns { id, email, name, password, token }.
// The token comes from impersonation so that tests do not use up the login
// rate limit.
export async function createUser(server, name, { verified = true } = {}) {
  const email = `${name.toLowerCase()}@example.test`;
  const record = await expectOk(
    api(server.url, '/api/collections/users/records', {
      method: 'POST',
      token: server.superuserToken,
      body: { email, name, password: PASSWORD, passwordConfirm: PASSWORD, verified },
    }),
    `Creating user ${name}`,
  );
  const token = await impersonate(server, record.id);
  return { id: record.id, email, name, password: PASSWORD, token };
}

export async function impersonate(server, userId, duration = 3600) {
  const { token } = await expectOk(
    api(server.url, `/api/collections/users/impersonate/${userId}`, {
      method: 'POST',
      token: server.superuserToken,
      body: { duration },
    }),
    `Impersonating user ${userId}`,
  );
  return token;
}

// Starts PocketBase and returns { url, superuserToken, stop }. Always call
// stop(), which ends the process and deletes the data directory. Pass
// `publicDir` to serve a copy of the frontend that a test may change.
export async function startServer({ publicDir = PUBLIC_DIR } = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'einkauf-test-'));
  const flags = dirFlags(dataDir, publicDir);
  try {
    await run('pocketbase', ['superuser', 'upsert', SUPERUSER.email, SUPERUSER.password, ...flags]);
  } catch (err) {
    await rm(dataDir, { recursive: true, force: true });
    throw new Error(`Creating the test superuser failed: ${err.stderr || err.message}`);
  }

  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const child = spawn('pocketbase', ['serve', `--http=127.0.0.1:${port}`, '--hooksWatch=false', ...flags], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', (d) => output.push(d.toString()));
  child.stderr.on('data', (d) => output.push(d.toString()));
  const exited = new Promise((r) => child.once('exit', r));

  const stop = async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await exited;
    }
    await rm(dataDir, { recursive: true, force: true });
  };

  try {
    await waitForHealth(url, child, output);
    const auth = await expectOk(
      api(url, '/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        body: { identity: SUPERUSER.email, password: SUPERUSER.password },
      }),
      'Superuser login',
    );
    return { url, superuserToken: auth.token, output, stop };
  } catch (err) {
    await stop();
    throw err;
  }
}
