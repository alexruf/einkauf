import { cp, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, row, test } from '../support/e2e.mjs';
import { startProxy } from '../support/proxy.mjs';
import { api, createUser, PUBLIC_DIR, startServer } from '../support/server.mjs';

// A separate server with a copy of the frontend, so the tests can deploy new
// versions without touching the repository. Each page reaches it through its
// own proxy; cutting the proxy breaks the realtime connection the way a
// server restart does, so the app reconnects.
let publicDir;
let server;
let user;
let deployed = 0;

let context;
let proxy;
let page;

test.beforeAll(async () => {
  publicDir = await mkdtemp(join(tmpdir(), 'einkauf-public-'));
  await cp(PUBLIC_DIR, publicDir, { recursive: true });
  server = await startServer({ publicDir });
  user = await createUser(server, 'Anna');
});

test.afterAll(async () => {
  await server?.stop();
  if (publicDir) await rm(publicDir, { recursive: true, force: true });
});

test.beforeEach(async ({ browser }) => {
  proxy = await startProxy(server.url);
  context = await browser.newContext({ baseURL: proxy.url });
  page = await context.newPage();
  await page.goto('/');
  await page.evaluate(
    ([token, record]) => localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record })),
    [user.token, { id: user.id, name: user.name, collectionName: 'users' }],
  );
  const checked = versionCheck();
  await page.reload();
  await checked;
  await expect(page.locator('#sync-indicator')).toContainText('Synchronisiert');
  // Gone after a reload, so the tests can tell whether the app reloaded.
  await page.evaluate(() => {
    window.notReloaded = true;
  });
});

test.afterEach(async () => {
  await context?.close();
  await proxy?.close();
});

// Resolves when the app has fetched the deployed version.
const versionCheck = () =>
  page.waitForResponse(
    (response) => response.request().resourceType() === 'fetch' && response.url().endsWith('/js/version.js'),
  );

const versionPath = () => join(publicDir, 'js', 'version.js');

// Replaces version.js with `text`.
async function writeVersionFile(text) {
  deployed += 1;
  await writeFile(versionPath(), text);
  // PocketBase only sends Last-Modified with whole seconds, so a file changed
  // within the second of the last request would be answered with 304.
  const later = new Date(Date.now() + 5000 * deployed);
  await utimes(versionPath(), later, later);
}

// Writes a new version.js and returns its version.
async function deploy() {
  const version = `2099.01.01.${deployed + 1}`;
  const text = await readFile(versionPath(), 'utf8');
  await writeVersionFile(text.replace(/^export const VERSION = '[^']+';$/m, `export const VERSION = '${version}';`));
  return version;
}

// Breaks the realtime connection and lets the app reconnect, as after a
// server restart. Resolves once the app has checked the version again.
async function reconnect() {
  const checked = versionCheck();
  proxy.cut();
  proxy.restore();
  await checked;
}

// A reload the app must not do would happen right after the check; give it
// that moment before asserting that it did not.
const reloaded = async () => {
  await page.waitForTimeout(500);
  return page.evaluate(() => window.notReloaded !== true);
};

test('given an idle app, when a new version is deployed and the app reconnects, then it reloads and shows the new version', async () => {
  const version = await deploy();
  await reconnect();
  await expect(page.locator('#app-version')).toHaveText(version);
});

test('given the deployed version is the running one, when the app reconnects, then it does not reload', async () => {
  const running = await page.locator('#app-version').textContent();
  await reconnect();
  expect(await reloaded()).toBe(false);
  await expect(page.locator('#app-version')).toHaveText(running);
});

// The check request bypasses the Service Worker, and Playwright cannot route
// such requests, so the server itself hands out a broken version.js.
test('given the deployed version cannot be read, when the app reconnects, then it does not reload and the next reconnect checks again', async () => {
  const running = await page.locator('#app-version').textContent();
  const original = await readFile(versionPath(), 'utf8');
  await writeVersionFile('// not a version file\n');
  await reconnect();
  expect(await reloaded()).toBe(false);
  await expect(page.locator('#app-version')).toHaveText(running);
  await expect(page.locator('#sync-indicator')).toContainText('Synchronisiert');

  await writeVersionFile(original);
  const version = await deploy();
  await reconnect();
  await expect(page.locator('#app-version')).toHaveText(version);
});

test('given text in the input field, when a new version is found, then the app waits and reloads after the item was added', async () => {
  const running = await page.locator('#app-version').textContent();
  await page.locator('#new-item').fill('Brot');
  const version = await deploy();
  await reconnect();
  expect(await reloaded()).toBe(false);
  await expect(page.locator('#new-item')).toHaveValue('Brot');
  await expect(page.locator('#app-version')).toHaveText(running);

  await page.locator('#new-item').press('Enter');
  await expect(page.locator('#app-version')).toHaveText(version);
  await expect(row(page, 'Brot')).toBeVisible();
  await expect(row(page, 'Brot')).not.toHaveClass(/is-pending/);
});

test('given a row in edit mode, when a new version is found, then the app reloads only after editing ended', async () => {
  const created = await api(server.url, '/api/collections/items/records', {
    method: 'POST',
    token: user.token,
    body: { text: 'Milch' },
  });
  expect(created.status).toBe(200);
  await row(page, 'Milch').getByRole('button', { name: 'Mehr' }).click();
  const editRow = page.locator('.item.is-editing');
  await expect(editRow).toBeVisible();

  const running = await page.locator('#app-version').textContent();
  const version = await deploy();
  await reconnect();
  expect(await reloaded()).toBe(false);
  await expect(editRow).toBeVisible();
  await expect(page.locator('#app-version')).toHaveText(running);

  await editRow.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.locator('#app-version')).toHaveText(version);
});

test('given a change waiting to be sent, when the app reloads for a new version, then the change is sent afterwards', async () => {
  proxy.cut();
  await context.setOffline(true);
  await page.locator('#new-item').fill('Eier');
  await page.locator('#new-item').press('Enter');
  await expect(row(page, 'Eier')).toHaveClass(/is-pending/);

  const version = await deploy();
  const checked = versionCheck();
  proxy.restore();
  await context.setOffline(false);
  await checked;

  await expect(page.locator('#app-version')).toHaveText(version);
  await expect(row(page, 'Eier')).not.toHaveClass(/is-pending/);
  const filter = encodeURIComponent('text = "Eier"');
  const items = await api(server.url, `/api/collections/items/records?filter=${filter}`, {
    token: server.superuserToken,
  });
  expect(items.body.items).toHaveLength(1);
});
