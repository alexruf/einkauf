import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  listItems,
  logOut,
  row,
  server,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';
import { impersonate } from '../support/server.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

async function logIn(page, user) {
  await page.getByLabel('E-Mail').fill(user.email);
  await page.getByLabel('Passwort').fill(user.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

// Anna adds "Eier" while offline, then her session expires before she is
// back online. Returns with the page offline on the login screen.
async function pendingChangeThenExpiredSession(page) {
  await createItem(anna, 'Milch');
  await page.reload();
  await expect(row(page, 'Milch')).toBeVisible();
  await waitForServiceWorker(page);

  await goOffline(page);
  await page.getByLabel('Neuer Eintrag').fill('Eier');
  await page.keyboard.press('Enter');
  await expect(row(page, 'Eier').locator('.pending')).toBeVisible();

  const expiring = await impersonate(server, anna.id, 1);
  await page.evaluate((token) => {
    const auth = JSON.parse(localStorage.getItem('pocketbase_auth'));
    localStorage.setItem('pocketbase_auth', JSON.stringify({ ...auth, token }));
  }, expiring);
  await page.waitForTimeout(1500);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(page.getByText('Eier')).toHaveCount(0);
}

test('given a logged-in user, when logging out and reopening the app offline, then no list data is shown', async ({
  annaPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await waitForServiceWorker(annaPage);

  await logOut(annaPage);

  await goOffline(annaPage);
  await annaPage.reload();
  await expect(annaPage.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(annaPage.getByText('Milch')).toHaveCount(0);
  const stored = await annaPage.evaluate(() => [
    localStorage.getItem('einkauf'),
    localStorage.getItem('pocketbase_auth'),
  ]);
  expect(stored).toEqual([null, null]);
  await goOnline(annaPage);
});

test('given pending changes and an expired session, when the same user logs in again, then the changes are synced', async ({
  annaPage,
}) => {
  await pendingChangeThenExpiredSession(annaPage);

  await goOnline(annaPage);
  await logIn(annaPage, anna);

  await expect(row(annaPage, 'Eier')).toBeVisible();
  await expect(row(annaPage, 'Eier').locator('.pending')).toBeHidden({ timeout: 10000 });
  const eier = (await listItems()).find((i) => i.text === 'Eier');
  expect(eier?.createdBy).toBe(anna.id);
});

test("given Anna's pending changes, when Ben logs in on the same device, then they are discarded and not sent", async ({
  annaPage,
}) => {
  await pendingChangeThenExpiredSession(annaPage);

  await goOnline(annaPage);
  await logIn(annaPage, ben);

  await expect(annaPage.locator('#user-name')).toHaveText('Ben');
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(row(annaPage, 'Eier')).toHaveCount(0);
  // Give a wrongly kept change time to reach the server before checking.
  await annaPage.waitForTimeout(1000);
  expect((await listItems()).map((i) => i.text)).toEqual(['Milch']);
});
