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

const { anna } = users;

test.beforeEach(deleteAllItems);

const menuButton = (page) => page.getByRole('button', { name: anna.name });
const logoutEntry = (page) => page.locator('#account-menu').getByRole('button', { name: 'Abmelden' });

test('given a logged-in user, then the header shows the display name and no logout button', async ({ annaPage }) => {
  await expect(menuButton(annaPage)).toBeVisible();
  await expect(annaPage.getByRole('button', { name: 'Abmelden' })).toHaveCount(0);
});

test('given the open account menu, then it names the logged-in user and dims the page behind it', async ({
  annaPage,
}) => {
  await menuButton(annaPage).click();

  const menu = annaPage.locator('#account-menu');
  await expect(menu).toContainText('Angemeldet als');
  await expect(menu.locator('.menu-user-name')).toHaveText(anna.name);
  const backdrop = await menu.evaluate((menu) => getComputedStyle(menu, '::backdrop').backgroundColor);
  expect(backdrop).not.toBe('rgba(0, 0, 0, 0)');
});

test('given a scrolled list, when the account menu is opened, then it opens below the name', async ({ annaPage }) => {
  for (let i = 1; i <= 40; i++) await createItem(anna, `Sorte ${i}`);
  await annaPage.reload();
  await expect(row(annaPage, 'Sorte 40')).toBeVisible();
  await annaPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => annaPage.evaluate(() => window.scrollY)).toBeGreaterThan(300);

  await menuButton(annaPage).click();

  const button = await menuButton(annaPage).boundingBox();
  const menu = annaPage.locator('#account-menu');
  await expect(menu).toBeInViewport({ ratio: 1 });
  const box = await menu.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(button.y + button.height);
  expect(box.y - (button.y + button.height)).toBeLessThanOrEqual(16);
});

test('given the account menu, when it is opened from the name and Escape is pressed, then it closes again', async ({
  annaPage,
}) => {
  await menuButton(annaPage).click();
  await expect(logoutEntry(annaPage)).toBeVisible();

  await annaPage.keyboard.press('Escape');

  await expect(logoutEntry(annaPage)).toBeHidden();
  await expect(menuButton(annaPage)).toBeVisible();
});

test('given the logout dialog, when the user cancels, then they stay logged in with the list unchanged', async ({
  annaPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();
  await expect(row(annaPage, 'Milch')).toBeVisible();

  await menuButton(annaPage).click();
  await logoutEntry(annaPage).click();
  const dialog = annaPage.getByRole('dialog');
  await expect(dialog).toContainText('Wirklich abmelden?');
  await dialog.getByRole('button', { name: 'Abbrechen' }).click();

  await expect(dialog).toBeHidden();
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(menuButton(annaPage)).toBeVisible();
});

test('given a pending offline change, when logging out, then the dialog warns that it will be lost', async ({
  annaPage,
}) => {
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await annaPage.getByLabel('Neuer Eintrag').fill('Eier');
  await annaPage.keyboard.press('Enter');
  await expect(row(annaPage, 'Eier').locator('.pending')).toBeVisible();

  await menuButton(annaPage).click();
  await logoutEntry(annaPage).click();

  await expect(annaPage.getByRole('dialog')).toContainText(
    '1 Änderung ist noch nicht übertragen und geht beim Abmelden verloren. Trotzdem abmelden?',
  );
  await annaPage.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await goOnline(annaPage);
});

test.describe('on a 360 px wide phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('given the open account menu, then its entry is a full tap target inside the screen', async ({ annaPage }) => {
    await menuButton(annaPage).tap();
    const box = await logoutEntry(annaPage).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  });
});
