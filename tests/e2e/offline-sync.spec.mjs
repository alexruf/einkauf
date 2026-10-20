import {
  createItem,
  deleteAllItems,
  deleteInApp,
  expect,
  goOffline,
  goOnline,
  listItems,
  openAs,
  row,
  rows,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';

const { anna, ben } = users;

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

test('given Anna changes the list offline, when she reconnects, then everyone sees her changes and she sees theirs', async ({
  annaPage,
  benPage,
}) => {
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
  await expect(row(benPage, 'Milch').locator('.meta')).toBeHidden();

  await expect(row(annaPage, 'Butter')).toBeVisible({ timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
  await expect(annaPage.getByRole('status')).toBeHidden();
  await expect(rows(annaPage)).toHaveCount(3);
});

test('given Anna deletes an item offline, when she reopens the app offline and then reconnects, then it stays hidden and is deleted for everyone', async ({
  annaPage,
  benPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch', 'Brot']);
  await deleteInApp(annaPage, 'Milch');
  await expect(row(annaPage, 'Milch')).toHaveCount(0);

  await annaPage.reload();
  await expect(row(annaPage, 'Brot')).toBeVisible();
  await expect(row(annaPage, 'Milch')).toHaveCount(0);
  await expect(row(benPage, 'Milch')).toBeVisible();

  await goOnline(annaPage);

  await expect(row(benPage, 'Milch')).toHaveCount(0, { timeout: 10000 });
  await expect(row(annaPage, 'Brot')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Brot']);
});

test('given Anna deletes an item offline and Ben then edits it online, when Anna reconnects, then nobody sees it', async ({
  annaPage,
  benPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch']);
  await deleteInApp(annaPage, 'Milch');
  await expect(row(annaPage, 'Milch')).toHaveCount(0);

  await benPage.reload();
  await row(benPage, 'Milch').getByRole('button', { name: 'Mehr' }).click();
  await benPage.locator('.item.is-editing').getByLabel('Eintrag').fill('Hafermilch');
  await benPage.keyboard.press('Enter');
  await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Hafermilch']);

  await goOnline(annaPage);

  await expect(row(benPage, 'Hafermilch')).toHaveCount(0, { timeout: 10000 });
  await expect(row(annaPage, 'Hafermilch')).toHaveCount(0);
  expect(await listItems()).toHaveLength(0);
  await expect(annaPage.getByRole('status')).toBeHidden();
});

test('given a delete made offline, when Anna asks to log out, then the dialog warns that 1 change will be lost', async ({
  annaPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch']);
  await deleteInApp(annaPage, 'Milch');
  await expect(row(annaPage, 'Milch')).toHaveCount(0);

  await annaPage.locator('.account-button').click();
  await annaPage.locator('#account-menu').getByRole('button', { name: 'Abmelden' }).click();

  await expect(annaPage.getByRole('dialog')).toContainText(
    '1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?',
  );
  await annaPage.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await goOnline(annaPage);
});

test('given Ben deletes an item Anna checked off offline, when Anna reconnects, then it stays deleted and her other changes sync', async ({
  annaPage,
  benPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch', 'Brot']);
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await add(annaPage, 'Eier');
  await row(annaPage, 'Brot').getByRole('checkbox').check();

  await benPage.reload();
  await deleteInApp(benPage, 'Milch');
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

test('given the realtime connection fails right after reconnecting, when the server answers again, then the app becomes connected', async ({
  annaPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch']);
  // Opening the app offline leaves it without a realtime connection.
  await annaPage.reload();
  await expect(annaPage.getByRole('status')).toContainText('Offline');

  // The first realtime attempt after reconnecting is refused, as under rate
  // limiting; later ones succeed.
  await annaPage.route(
    '**/api/realtime',
    (route) => route.fulfill({ status: 429, json: { message: 'Too Many Requests' } }),
    { times: 1 },
  );
  await goOnline(annaPage);

  await expect(annaPage.locator('#sync-indicator')).toContainText('Synchronisiert', { timeout: 15000 });
  await expect(annaPage.getByRole('status')).toBeHidden();
});

test('given Ben adds an item while the app starts listening for changes, when listening begins, then Anna sees it', async ({
  page,
}) => {
  // Item reads still on their way, so the test can wait until all are done.
  let readsInFlight = 0;
  const isItemRead = (request) => request.method() === 'GET' && request.url().includes('/api/collections/items/');
  page.on('request', (request) => isItemRead(request) && readsInFlight++);
  page.on('requestfinished', (request) => isItemRead(request) && readsInFlight--);
  page.on('requestfailed', (request) => isItemRead(request) && readsInFlight--);
  // The request that subscribes to item changes is held back.
  let held;
  const subscriptionHeld = new Promise((resolve) => {
    held = resolve;
  });
  let release;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/api/realtime', async (route) => {
    if (route.request().method() !== 'POST' || !route.request().postData().includes('items/*')) {
      await route.fallback();
      return;
    }
    held();
    await released;
    await route.continue();
  });

  await openAs(page, anna);
  await subscriptionHeld;
  await expect(page.locator('#empty')).toBeVisible();
  await expect.poll(() => readsInFlight).toBe(0);
  await createItem(ben, 'Brot');
  release();

  await expect(row(page, 'Brot')).toBeVisible();
});

async function saveNote(page, text, note) {
  await row(page, text).getByRole('button', { name: 'Mehr' }).click();
  const editRow = page.locator('.item.is-editing');
  await editRow.getByLabel('Menge oder Hinweis').fill(note);
  await editRow.getByRole('button', { name: 'Speichern' }).click();
  await expect(editRow).toHaveCount(0);
}

test('given Anna adds and edits notes offline, when she reconnects, then Ben sees both notes', async ({
  annaPage,
  benPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch']);

  await add(annaPage, 'Eier, 10');
  await saveNote(annaPage, 'Milch', '2x');
  await expect(row(annaPage, 'Eier').locator('.text')).toHaveText('Eier · 10');
  await expect(row(annaPage, 'Milch').locator('.text')).toHaveText('Milch · 2x');
  await expect(pending(annaPage, 'Eier')).toBeVisible();
  await expect(pending(annaPage, 'Milch')).toBeVisible();

  await goOnline(annaPage);

  await expect(row(benPage, 'Eier').locator('.text')).toHaveText('Eier · 10', { timeout: 10000 });
  await expect(row(benPage, 'Milch').locator('.text')).toHaveText('Milch · 2x');
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
});

test('given Anna changes a note offline while Ben changes the text online, when she reconnects, then both changes remain', async ({
  annaPage,
  benPage,
}) => {
  await annaGoesOffline(annaPage, ['Milch']);
  await saveNote(annaPage, 'Milch', '2x');

  await row(benPage, 'Milch').getByRole('button', { name: 'Mehr' }).click();
  await benPage.locator('.item.is-editing').getByLabel('Eintrag').fill('Hafermilch');
  await benPage.locator('.item.is-editing').getByRole('button', { name: 'Speichern' }).click();
  await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Hafermilch']);

  await goOnline(annaPage);

  for (const page of [annaPage, benPage]) {
    await expect(row(page, 'Hafermilch').locator('.text')).toHaveText('Hafermilch · 2x', { timeout: 10000 });
  }
});
