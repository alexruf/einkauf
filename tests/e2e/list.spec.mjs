import { createItem, deleteAllItems, expect, listItems, row, rows, server, test, users } from '../support/e2e.mjs';
import { api, createUser } from '../support/server.mjs';

const { ben } = users;

test.beforeEach(deleteAllItems);

async function add(page, text) {
  await page.getByLabel('Neuer Eintrag').fill(text);
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
}

test('given Anna and Ben online, when Anna adds an item, then Ben sees it within seconds with "von Anna"', async ({
  annaPage,
  benPage,
}) => {
  await add(annaPage, 'Milch');

  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(row(benPage, 'Milch').locator('.meta')).toHaveText('von Anna', { timeout: 5000 });
  await expect(row(benPage, 'Milch').getByRole('checkbox')).not.toBeChecked();
  // Once confirmed by the server, the item is no longer marked as pending.
  await expect(row(annaPage, 'Milch').locator('.pending')).toBeHidden();
});

test('given an item by Anna, when Ben checks it off, then Anna sees it checked without a meta line', async ({
  annaPage,
  benPage,
}) => {
  await add(annaPage, 'Brot');
  await add(annaPage, 'Butter');
  await expect(row(benPage, 'Brot')).toBeVisible();

  // Tapping anywhere on the row toggles it, not only the checkbox.
  await row(benPage, 'Brot').locator('.text').click();

  const annaRow = row(annaPage, 'Brot');
  await expect(annaRow.getByRole('checkbox')).toBeChecked({ timeout: 5000 });
  // Who added or changed a bought item no longer matters.
  await expect(annaRow.locator('.meta')).toBeHidden();
  // Checked items move below the open ones and are greyed out.
  await expect(rows(annaPage).locator('.text')).toHaveText(['Butter', 'Brot']);
  await expect(annaRow).toHaveClass(/is-checked/);

  const [stored] = (await listItems()).filter((i) => i.text === 'Brot');
  expect(stored.checked).toBe(true);
  expect(stored.updatedBy).toBe(ben.id);
});

test('given a checked item, when Anna un-checks it, then it is open again for both', async ({ annaPage, benPage }) => {
  await add(annaPage, 'Käse');
  await row(annaPage, 'Käse').getByRole('checkbox').check();
  await expect(row(benPage, 'Käse').getByRole('checkbox')).toBeChecked();

  await row(annaPage, 'Käse').getByRole('checkbox').uncheck();
  await expect(row(benPage, 'Käse').getByRole('checkbox')).not.toBeChecked();
  await expect(row(benPage, 'Käse')).not.toHaveClass(/is-checked/);
});

// Items created right after each other through the API can share a
// creation time, and then their order is decided by the random id. These
// tests therefore read the order from the screen instead of assuming it.
async function threeItems(page) {
  for (const text of ['Milch', 'Brot', 'Salz']) await createItem(users.anna, text);
  await page.reload();
  await expect(rows(page)).toHaveCount(3);
  return rows(page).locator('.text').allTextContents();
}

test('given three items, when Anna checks off the middle one, then it stays in place for a moment and then moves down', async ({
  annaPage,
}) => {
  const [first, middle, last] = await threeItems(annaPage);

  await row(annaPage, middle).getByRole('checkbox').check();

  // Right after the tap the row is checked but has not moved.
  await expect(row(annaPage, middle).getByRole('checkbox')).toBeChecked();
  await expect(rows(annaPage).locator('.text')).toHaveText([first, middle, last], { timeout: 300 });
  // After the hold it moves below the open items.
  await expect(rows(annaPage).locator('.text')).toHaveText([first, last, middle]);
});

test('given Anna checks off two items quickly, then both stay in place until the hold after the second tap ends', async ({
  annaPage,
}) => {
  const [first, second, last] = await threeItems(annaPage);

  await row(annaPage, first).getByRole('checkbox').check();
  await row(annaPage, second).getByRole('checkbox').check();

  await expect(rows(annaPage).locator('.text')).toHaveText([first, second, last], { timeout: 300 });
  // Then both move together; the one checked off last comes first.
  await expect(rows(annaPage).locator('.text')).toHaveText([last, second, first]);
});

test('given Anna checks off an item by mistake, when she un-checks it during the hold, then it stays open in place', async ({
  annaPage,
}) => {
  const order = await threeItems(annaPage);

  const checkbox = row(annaPage, order[1]).getByRole('checkbox');
  await checkbox.check();
  await checkbox.uncheck();

  await expect(rows(annaPage).locator('.text')).toHaveText(order);
  await annaPage.waitForTimeout(2000);
  await expect(rows(annaPage).locator('.text')).toHaveText(order);
  await expect(checkbox).not.toBeChecked();
});

test("given Ben checks off an item, then it moves on Anna's screen without waiting", async ({ annaPage, benPage }) => {
  const [first, middle, last] = await threeItems(annaPage);
  await benPage.reload();

  await row(benPage, first).getByRole('checkbox').check();

  await expect(row(annaPage, first).getByRole('checkbox')).toBeChecked({ timeout: 5000 });
  // As soon as Anna sees the change, the row is already in its new place.
  await expect(rows(annaPage).locator('.text')).toHaveText([middle, last, first], { timeout: 300 });
});

test('given item text with markup, when added, then everyone sees exactly that text and no script runs', async ({
  annaPage,
  benPage,
}) => {
  const markup = '<img src=x onerror=alert(1)>';
  let dialogs = 0;
  for (const page of [annaPage, benPage]) page.on('dialog', () => dialogs++);

  await add(annaPage, markup);
  await expect(row(benPage, markup).locator('.text')).toHaveText(markup);
  await expect(row(annaPage, markup).locator('.text')).toHaveText(markup);
  await expect(benPage.locator('#items img')).toHaveCount(0);
  expect(dialogs).toBe(0);
});

test('given empty or whitespace text, when adding, then no item is created', async ({ annaPage }) => {
  await add(annaPage, '   ');
  await add(annaPage, '');
  await expect(annaPage.getByText('Alles erledigt.')).toBeVisible();
  expect(await listItems()).toHaveLength(0);
});

test('given an item whose creator account was removed, then it shows "Unbekannt"', async ({ annaPage }) => {
  const dora = await createUser(server, 'Dora');
  await createItem(dora, 'Salz');
  await api(server.url, `/api/collections/users/records/${dora.id}`, {
    method: 'DELETE',
    token: server.superuserToken,
  });

  await annaPage.reload();
  await expect(row(annaPage, 'Salz').locator('.meta')).toHaveText('von Unbekannt');
});
