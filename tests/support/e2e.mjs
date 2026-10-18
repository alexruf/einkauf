// Helpers for browser tests. The server and the users Anna, Ben and Carla
// come from global setup.

import { test as base, expect } from './playwright.mjs';
import { startProxy } from './proxy.mjs';
import { api, impersonate } from './server.mjs';

export const server = {
  get url() {
    return process.env.EINKAUF_URL;
  },
  get superuserToken() {
    return process.env.EINKAUF_SUPERUSER_TOKEN;
  },
};

export const users = JSON.parse(process.env.EINKAUF_USERS ?? '{}');

const ITEMS = '/api/collections/items/records';

// All tests share one list, so every test starts with an empty one.
export async function deleteAllItems() {
  const res = await api(server.url, `${ITEMS}?perPage=500&fields=id`, { token: server.superuserToken });
  for (const { id } of res.body.items) {
    await api(server.url, `${ITEMS}/${id}`, { method: 'DELETE', token: server.superuserToken });
  }
}

export async function createItem(user, text) {
  const res = await api(server.url, ITEMS, { method: 'POST', token: user.token, body: { text } });
  if (res.status !== 200) throw new Error(`Creating "${text}" failed: ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function listItems() {
  const res = await api(server.url, `${ITEMS}?perPage=500`, { token: server.superuserToken });
  return res.body.items;
}

// Opens the app logged in as `user`, the way the SDK stores a session, but
// without a password login, which is rate limited. `duration` sets how long
// the token stays valid, in seconds.
export async function openAs(page, user, { duration } = {}) {
  const token = duration ? await impersonate(server, user.id, duration) : user.token;
  await page.goto('/');
  await page.evaluate(
    ([token, record]) => localStorage.setItem('pocketbase_auth', JSON.stringify({ token, record })),
    [token, { id: user.id, name: user.name, collectionName: 'users', collectionId: '_pb_users_auth_' }],
  );
  await page.reload();
}

// Logs out the way a user does: through the account menu and the
// confirmation dialog.
export async function logOut(page) {
  await page.locator('.account-button').click();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
}

// The rows of the list in the order the user sees them: open items, then
// the checked-off items of the "Erledigt" section, which may be collapsed.
export const rows = (page) => page.locator('.items > li');
export const row = (page, text) => rows(page).filter({ has: page.locator('.text', { hasText: text }) });

// Deletes an item the way a user does: through the edit mode of its row.
export async function deleteInApp(page, text) {
  await row(page, text).getByRole('button', { name: 'Mehr' }).click();
  await page.locator('.item.is-editing').getByRole('button', { name: 'Löschen' }).click();
}

// Opens the collapsed "Erledigt" section, so checked-off rows are visible.
export async function expandDone(page) {
  const toggle = page.locator('#done-toggle');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
}

// The proxy each fixture context talks through, so tests can cut it.
const proxies = new WeakMap();

// `annaPage` and `benPage` are logged-in pages in separate browser contexts,
// like two phones. Each reaches the server through its own proxy, so one can
// lose the connection while the other stays online. Contexts and proxies are
// closed after the test. They start with the "Erledigt" section open, so
// tests can act on checked-off rows; tests of the collapsed default use the
// plain `page` fixture.
function pageFor(user) {
  return async ({ browser }, use) => {
    const proxy = await startProxy(server.url);
    const context = await browser.newContext({ baseURL: proxy.url });
    // Only a first default: a test that collapses the section keeps that
    // choice across reloads.
    await context.addInitScript(() => {
      if (!localStorage.getItem('einkauf-prefs')) localStorage.setItem('einkauf-prefs', '{"doneOpen":true}');
    });
    proxies.set(context, proxy);
    const page = await context.newPage();
    await openAs(page, user);
    await use(page);
    await context.close();
    await proxy.close();
  };
}

export const test = base.extend({
  annaPage: pageFor(users.anna),
  benPage: pageFor(users.ben),
});

export { expect };

// Resolves once the Service Worker controls the page, so the app shell is
// cached and a reload can be served offline. A page that loaded while the
// worker was still activating is not claimed by it; a reload fixes that, just
// as the next app start does for a real user.
export async function waitForServiceWorker(page) {
  const controlled = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    return Boolean(navigator.serviceWorker.controller);
  });
  if (controlled) return;
  await page.reload();
  const controlledAfterReload = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  if (!controlledAfterReload) throw new Error('The Service Worker does not control the page even after a reload');
}

function proxyOf(page) {
  const proxy = proxies.get(page.context());
  if (!proxy) throw new Error('goOffline and goOnline need a page from the annaPage or benPage fixture');
  return proxy;
}

// Makes the server unreachable for this page's context. The browser's offline
// emulation is switched on too, so the app also gets the `offline` event;
// alone it is not enough, because right after a reload Chromium occasionally
// lets the first request through while reporting it as failed.
export async function goOffline(page) {
  proxyOf(page).cut();
  await page.context().setOffline(true);
}

export async function goOnline(page) {
  proxyOf(page).restore();
  await page.context().setOffline(false);
}
