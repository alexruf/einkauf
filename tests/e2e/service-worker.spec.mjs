import { cp, mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  row,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';
import { createUser, PUBLIC_DIR, startServer } from '../support/server.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

test('given the list was opened online, when the app is opened offline, then it shows the last known list and the offline hint', async ({
  annaPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await waitForServiceWorker(annaPage);

  await goOffline(annaPage);
  await annaPage.reload();
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(annaPage.getByRole('status')).toHaveText('Offline – Änderungen werden später übertragen.');
  await expect(annaPage.locator('#user-name')).toHaveText('Anna');

  // The offline emulation also cuts the Service Worker's own requests: a file
  // that is not cached fails instead of reaching the server.
  const reachedServer = await annaPage.evaluate(() =>
    fetch('/not-cached.js').then(
      () => true,
      () => false,
    ),
  );
  expect(reachedServer).toBe(false);
  await goOnline(annaPage);
});

test('given a cached file, when it is requested with cache mode "no-store" offline, then the request fails instead of being answered from the cache', async ({
  annaPage,
}) => {
  await waitForServiceWorker(annaPage);
  const fetchVersion = () =>
    annaPage.evaluate(() =>
      fetch('/js/version.js', { cache: 'no-store' }).then(
        (response) => response.ok,
        () => false,
      ),
    );
  expect(await fetchVersion()).toBe(true);

  await goOffline(annaPage);
  expect(await fetchVersion()).toBe(false);
  await goOnline(annaPage);
});

test('given every file in pb_public, then the Service Worker precaches it', async () => {
  const sw = await readFile(join(PUBLIC_DIR, 'sw.js'), 'utf8');
  const files = (await readdir(PUBLIC_DIR, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `/${relative(PUBLIC_DIR, join(entry.parentPath, entry.name))}`)
    .filter((path) => path !== '/sw.js' && path !== '/index.html');
  for (const path of files) expect(sw, `${path} missing from SHELL in sw.js`).toContain(`'${path}'`);
});

test.describe('after a deployment', () => {
  let publicDir;
  let server;
  let user;

  test.beforeAll(async () => {
    // A separate server with a copy of the frontend, so the test can change
    // index.html without touching the repository.
    publicDir = await mkdtemp(join(tmpdir(), 'einkauf-public-'));
    await cp(PUBLIC_DIR, publicDir, { recursive: true });
    server = await startServer({ publicDir });
    user = await createUser(server, 'Anna');
  });

  test.afterAll(async () => {
    await server?.stop();
    if (publicDir) await rm(publicDir, { recursive: true, force: true });
  });

  test('given a changed index.html, when the app is opened online, then the new version is shown', async ({ page }) => {
    await page.goto(server.url);
    await page.evaluate(
      ([token, record]) => localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record })),
      [user.token, { id: user.id, name: user.name, collectionName: 'users' }],
    );
    await page.reload();
    await waitForServiceWorker(page);
    await page.reload();
    await expect(page.locator('#list-screen')).toBeVisible();
    const marker = page.locator('#deployed');
    await expect(marker).toHaveCount(0);

    // The marker is an element the app's script never touches, unlike the
    // title, which the app sets to the configured name.
    const indexPath = join(publicDir, 'index.html');
    const html = await readFile(indexPath, 'utf8');
    await writeFile(indexPath, html.replace('</body>', '<p id="deployed">neu</p></body>'));
    // PocketBase only sends Last-Modified with whole seconds, so a file changed
    // within the second of the last request would be answered with 304. A real
    // deployment changes files much later; make that explicit.
    const later = new Date(Date.now() + 5000);
    await utimes(indexPath, later, later);

    await page.reload();
    await expect(marker).toHaveText('neu');

    // The cache now holds the new version too.
    await page.context().setOffline(true);
    await page.reload();
    await expect(marker).toHaveText('neu');
    await page.context().setOffline(false);
  });
});
