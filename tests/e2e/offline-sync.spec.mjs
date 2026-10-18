import { test, expect, users, deleteAllItems, createItem, row, rows, listItems, waitForServiceWorker, goOffline, goOnline } from '../support/e2e.mjs';

const { ben } = users;

test.beforeEach(deleteAllItems);

async function add(page, text) {
  await page.getByLabel('Neuer Eintrag').fill(text);
  await page.keyboard.press('Enter');
}

const pending = (page, text) => row(page, text).locator('.pending');

// Ben puts items on the list; Anna's phone caches it and then loses the
// connection.
async function annaGoesOffline(annaPage, items) {
  for (const text of items) await createItem(ben, text);
  await annaPage.reload();
  for (const text of items) await expect(row(annaPage, text)).toBeVisible();
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await expect(annaPage.getByRole('status')).toContainText('Offline');
}

test('given Anna changes the list offline, when she reconnects, then everyone sees her changes and she sees theirs', async ({ annaPage, benPage }) => {
  await annaGoesOffline(annaPage, ['Milch']);

  await add(annaPage, 'Eier');
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await expect(row(annaPage, 'Eier').getByRole('checkbox')).not.toBeChecked();
  await expect(row(annaPage, 'Milch').getByRole('checkbox')).toBeChecked();
  await expect(pending(annaPage, 'Eier')).toBeVisible();
  await expect(pending(annaPage, 'Milch')).toBeVisible();

  // Closing and reopening the app while still offline keeps the changes.
  await annaPage.reload();
  await expect(pending(annaPage, 'Eier')).toBeVisible();
  await expect(pending(annaPage, 'Milch')).toBeVisible();
  await expect(row(annaPage, 'Milch').getByRole('checkbox')).toBeChecked();

  // Meanwhile Ben, who is online, adds something.
  await add(benPage, 'Butter');
  await expect(row(benPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text).sort()).toEqual(['Butter', 'Milch']);

  await goOnline(annaPage);

  await expect(row(benPage, 'Eier')).toBeVisible({ timeout: 10000 });
  await expect(row(benPage, 'Eier').locator('.meta')).toHaveText('von Anna');
  await expect(row(benPage, 'Milch').getByRole('checkbox')).toBeChecked();
  await expect(row(benPage, 'Milch').locator('.meta')).toHaveText('von Ben · zuletzt Anna');

  await expect(row(annaPage, 'Butter')).toBeVisible({ timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
  await expect(annaPage.getByRole('status')).toBeHidden();
  await expect(rows(annaPage)).toHaveCount(3);
});

test('given Ben deletes an item Anna checked off offline, when Anna reconnects, then it stays deleted and her other changes sync', async ({ annaPage, benPage }) => {
  await annaGoesOffline(annaPage, ['Milch', 'Brot']);
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await add(annaPage, 'Eier');
  await row(annaPage, 'Brot').getByRole('checkbox').check();

  await benPage.reload();
  await row(benPage, 'Milch').getByRole('button', { name: 'Löschen' }).click();
  await benPage.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(row(benPage, 'Milch')).toHaveCount(0);

  await goOnline(annaPage);

  await expect(row(benPage, 'Eier')).toBeVisible({ timeout: 10000 });
  await expect(row(benPage, 'Brot').getByRole('checkbox')).toBeChecked();
  await expect(row(annaPage, 'Milch')).toHaveCount(0, { timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
  await expect(row(benPage, 'Milch')).toHaveCount(0);
  expect((await listItems()).map((i) => i.text).sort()).toEqual(['Brot', 'Eier']);
  // Dropping a change to a deleted item is expected and needs no notice.
  await expect(annaPage.getByRole('status')).toBeHidden();
});

test('given the realtime connection fails right after reconnecting, when the server answers again, then the app becomes connected', async ({ annaPage }) => {
  await annaGoesOffline(annaPage, ['Milch']);
  // Opening the app offline leaves it without a realtime connection.
  await annaPage.reload();
  await expect(annaPage.getByRole('status')).toContainText('Offline');

  // The first realtime attempt after reconnecting is refused, as under rate
  // limiting; later ones succeed.
  await annaPage.route('**/api/realtime', (route) => route.fulfill({ status: 429, json: { message: 'Too Many Requests' } }), { times: 1 });
  await goOnline(annaPage);

  await expect(annaPage.locator('#connection-indicator')).toContainText('Verbunden', { timeout: 15000 });
  await expect(annaPage.getByRole('status')).toBeHidden();
});
