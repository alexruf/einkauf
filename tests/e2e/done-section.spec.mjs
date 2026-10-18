import { createItem, deleteAllItems, expect, openAs, row, test, users } from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

const toggle = (page) => page.locator('#done-toggle');
const doneRows = (page) => page.locator('#done-items > li');

// Checks off `texts` through the UI and waits until they settled into the
// "Erledigt" section.
async function checkOff(page, texts) {
  for (const text of texts) await row(page, text).getByRole('checkbox').check();
  await expect(toggle(page)).toContainText(`Erledigt (${texts.length})`);
  await expect(page.locator('#items > li')).toHaveCount(0);
}

// The plain `page` fixture starts like a new device, with nothing remembered.
test('given a new device, then the "Erledigt" section shows the count and is collapsed', async ({ page }) => {
  for (const text of ['Milch', 'Brot', 'Salz']) await createItem(anna, text);
  await openAs(page, anna);
  await checkOff(page, ['Milch', 'Brot', 'Salz']);

  await expect(toggle(page)).toHaveText('Erledigt (3)');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(doneRows(page).first()).toBeHidden();
});

test('given the collapsed section, when it is clicked, then the checked-off items are shown', async ({ page }) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);
  await checkOff(page, ['Milch']);

  await toggle(page).click();

  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(row(page, 'Milch')).toBeVisible();
});

test('given the collapsed section, when it is opened with the keyboard, then the checked-off items are shown', async ({
  page,
}) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);
  await checkOff(page, ['Milch']);

  await toggle(page).focus();
  await page.keyboard.press('Enter');

  await expect(row(page, 'Milch')).toBeVisible();
  await page.keyboard.press('Space');
  await expect(row(page, 'Milch')).toBeHidden();
});

test('given the section was opened, when the app reloads, then it is still open', async ({ page }) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);
  await checkOff(page, ['Milch']);
  await toggle(page).click();

  await page.reload();

  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(row(page, 'Milch')).toBeVisible();
});

test('given no checked-off items, then no "Erledigt" section is shown', async ({ page }) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);

  await expect(row(page, 'Milch')).toBeVisible();
  await expect(page.locator('#done')).toBeHidden();
});

test('given an empty list, then the empty state invites adding something', async ({ page }) => {
  await openAs(page, anna);

  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#empty')).toContainText('Alles erledigt.');
  await expect(page.locator('#empty')).toContainText('Was wird als Nächstes gebraucht?');
  await expect(page.locator('#done')).toBeHidden();
});

test('given only checked-off items, then the empty state is shown above the "Erledigt" section', async ({ page }) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);
  await checkOff(page, ['Milch']);

  await expect(page.locator('#empty')).toBeVisible();
  await expect(page.locator('#done')).toBeVisible();
  const [empty, done] = await Promise.all([page.locator('#empty').boundingBox(), page.locator('#done').boundingBox()]);
  expect(empty.y).toBeLessThan(done.y);
});
