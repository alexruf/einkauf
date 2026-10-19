import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  row,
  rows,
  server,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';
import { api } from '../support/server.mjs';

const { anna } = users;

const PURCHASES = '/api/collections/purchases/records';

async function deleteAllPurchases() {
  const res = await api(server.url, `${PURCHASES}?perPage=500&fields=id`, { token: server.superuserToken });
  for (const { id } of res.body.items) {
    await api(server.url, `${PURCHASES}/${id}`, { method: 'DELETE', token: server.superuserToken });
  }
}

// Stores a past purchase directly, as if the family had bought it `count` times.
async function seedPurchase(text, count = 1) {
  const body = { key: text.toLowerCase(), text, count, lastAt: new Date().toISOString().replace('T', ' ') };
  const res = await api(server.url, PURCHASES, { method: 'POST', token: server.superuserToken, body });
  if (res.status !== 200) throw new Error(`Seeding "${text}" failed: ${JSON.stringify(res.body)}`);
}

test.beforeEach(async () => {
  await deleteAllItems();
  await deleteAllPurchases();
});

const field = (page) => page.getByLabel('Neuer Eintrag');
const listbox = (page) => page.getByRole('listbox');
const option = (page, name) => listbox(page).getByRole('option', { name, exact: true });

// Seeds purchases and reloads, so the app loads them with the list.
async function withPurchases(page, purchases) {
  for (const [text, count] of purchases) await seedPurchase(text, count);
  await page.reload();
  await expect(page.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');
}

test('given Anna checked off "Milch", when she types "mi", then "Milch" is suggested', async ({ annaPage }) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

  await field(annaPage).fill('mi');

  await expect(option(annaPage, 'Milch')).toBeVisible();
  await expect(field(annaPage)).toHaveAttribute('aria-expanded', 'true');
});

test('given past purchases, when typing, then matches are ranked word starts first and one character suggests nothing', async ({
  annaPage,
}) => {
  await withPurchases(annaPage, [
    ['Hafermilch', 5],
    ['Mineralwasser', 3],
    ['Milch', 14],
    ['Brot', 9],
  ]);

  await field(annaPage).fill('m');
  await expect(listbox(annaPage)).toBeHidden();
  await expect(field(annaPage)).toHaveAttribute('aria-expanded', 'false');

  await field(annaPage).fill('mi');
  await expect(listbox(annaPage).getByRole('option')).toHaveText(['Milch', 'Mineralwasser', 'Hafermilch']);

  await field(annaPage).fill('xyz');
  await expect(listbox(annaPage)).toBeHidden();
});

test('given a suggestion, when Anna taps it, then it is added, the field is empty and keeps the focus', async ({
  annaPage,
}) => {
  await withPurchases(annaPage, [['Milch', 3]]);

  await field(annaPage).fill('mi');
  await option(annaPage, 'Milch').click();

  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(field(annaPage)).toHaveValue('');
  await expect(field(annaPage)).toBeFocused();
  await expect(listbox(annaPage)).toBeHidden();
});

test('given "Milch 2x" is suggested, when Anna submits "Milch", then the typed text is added', async ({ annaPage }) => {
  await withPurchases(annaPage, [['Milch 2x', 3]]);

  await field(annaPage).fill('Milch');
  await expect(option(annaPage, 'Milch 2x')).toBeVisible();
  await field(annaPage).press('Enter');

  await expect(rows(annaPage)).toHaveCount(1);
  await expect(rows(annaPage).locator('.text')).toHaveText('Milch');
  await expect(listbox(annaPage)).toBeHidden();
});

test('given "Milch" is an open item, then its suggestion says it is on the list and tapping it adds nothing', async ({
  annaPage,
}) => {
  await createItem(anna, 'Milch');
  await withPurchases(annaPage, [['Milch', 3]]);

  await field(annaPage).fill('mi');
  const onList = option(annaPage, 'Milch steht schon drauf');
  await expect(onList).toHaveAttribute('aria-disabled', 'true');
  // A finger taps it anyway; Playwright would wait for it to become enabled.
  await onList.click({ force: true });

  await expect(rows(annaPage)).toHaveCount(1);
  await expect(field(annaPage)).toHaveValue('mi');
});

test('given suggestions, when Anna presses the down arrow and Enter, then the first suggestion is added', async ({
  annaPage,
}) => {
  await withPurchases(annaPage, [
    ['Milch', 5],
    ['Mineralwasser', 1],
  ]);

  await field(annaPage).fill('mi');
  await field(annaPage).press('ArrowDown');
  await expect(option(annaPage, 'Milch')).toHaveAttribute('aria-selected', 'true');
  await field(annaPage).press('Enter');

  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(rows(annaPage)).toHaveCount(1);
  await expect(field(annaPage)).toHaveValue('');
});

test('given an open item ranked first, when Anna presses the down arrow, then it is skipped', async ({ annaPage }) => {
  await createItem(anna, 'Milch');
  await withPurchases(annaPage, [
    ['Milch', 5],
    ['Mineralwasser', 1],
  ]);

  await field(annaPage).fill('mi');
  await field(annaPage).press('ArrowDown');
  await expect(option(annaPage, 'Mineralwasser')).toHaveAttribute('aria-selected', 'true');
});

test('given suggestions, when Anna presses Escape, then they hide and the typed text stays', async ({ annaPage }) => {
  await withPurchases(annaPage, [['Milch', 3]]);

  await field(annaPage).fill('mi');
  await expect(listbox(annaPage)).toBeVisible();
  await field(annaPage).press('Escape');

  await expect(listbox(annaPage)).toBeHidden();
  await expect(field(annaPage)).toHaveValue('mi');
});

test('given the device is offline, then suggestions still appear, also after reopening the app', async ({
  annaPage,
}) => {
  await withPurchases(annaPage, [['Milch', 3]]);
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);

  await field(annaPage).fill('mi');
  await expect(option(annaPage, 'Milch')).toBeVisible();

  await annaPage.reload();
  await field(annaPage).fill('mi');
  await expect(option(annaPage, 'Milch')).toBeVisible();
  await goOnline(annaPage);
});

test('given purchases cannot be loaded, then the list still synchronizes and the known suggestions stay', async ({
  annaPage,
  benPage,
}) => {
  await withPurchases(annaPage, [['Milch', 3]]);
  await annaPage.route('**/api/collections/purchases/**', (route) => route.abort());

  await field(benPage).fill('Brot');
  await field(benPage).press('Enter');
  await field(annaPage).fill('Eier');
  await field(annaPage).press('Enter');

  await expect(row(annaPage, 'Brot')).toBeVisible();
  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');
  await expect(row(benPage, 'Eier')).toBeVisible();
  await expect(annaPage.getByRole('status')).toBeHidden();

  await field(annaPage).fill('mi');
  await expect(option(annaPage, 'Milch')).toBeVisible();
});

test('given Anna buys "Kaffee" for the first time, then Ben is offered it after his next synchronization', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Kaffee');
  await annaPage.reload();
  await row(annaPage, 'Kaffee').getByRole('checkbox').check();
  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

  // Ben adds something, which synchronizes his app.
  await field(benPage).fill('Tee');
  await field(benPage).press('Enter');
  await expect(row(benPage, 'Tee')).toBeVisible();
  await expect(benPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

  await field(benPage).fill('ka');
  await expect(option(benPage, 'Kaffee')).toBeVisible();
});

test.describe('on a 360 px wide phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('given suggestions, then each is a full tap target inside the screen and a tap adds it', async ({
    annaPage,
  }) => {
    await withPurchases(annaPage, [
      ['Milch', 5],
      ['Mineralwasser mit viel Kohlensäure aus der Glasflasche', 1],
    ]);

    await field(annaPage).fill('mi');
    for (const box of await Promise.all(
      (await listbox(annaPage).getByRole('option').all()).map((o) => o.boundingBox()),
    )) {
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }

    await option(annaPage, 'Milch').tap();
    await expect(row(annaPage, 'Milch')).toBeVisible();
    await expect(field(annaPage)).toBeFocused();
  });
});
