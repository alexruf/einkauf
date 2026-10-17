import { test, expect, users, server, deleteAllItems, createItem, row, rows, listItems } from '../support/e2e.mjs';
import { api, createUser } from '../support/server.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

async function add(page, text) {
  await page.getByLabel('Neuer Eintrag').fill(text);
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
}

test('given Anna and Ben online, when Anna adds an item, then Ben sees it within seconds with "von Anna"', async ({ annaPage, benPage }) => {
  await add(annaPage, 'Milch');

  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(row(benPage, 'Milch').locator('.meta')).toHaveText('von Anna', { timeout: 5000 });
  await expect(row(benPage, 'Milch').getByRole('checkbox')).not.toBeChecked();
  // Once confirmed by the server, the item is no longer marked as pending.
  await expect(row(annaPage, 'Milch').locator('.pending')).toBeHidden();
});

test('given an item by Anna, when Ben checks it off, then Anna sees it checked with "zuletzt Ben"', async ({ annaPage, benPage }) => {
  await add(annaPage, 'Brot');
  await add(annaPage, 'Butter');
  await expect(row(benPage, 'Brot')).toBeVisible();

  // Tapping anywhere on the row toggles it, not only the checkbox.
  await row(benPage, 'Brot').locator('.text').click();

  const annaRow = row(annaPage, 'Brot');
  await expect(annaRow.locator('.meta')).toHaveText('von Anna · zuletzt Ben', { timeout: 5000 });
  await expect(annaRow.getByRole('checkbox')).toBeChecked();
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

test('given item text with markup, when added, then everyone sees exactly that text and no script runs', async ({ annaPage, benPage }) => {
  const markup = '<img src=x onerror=alert(1)>';
  let dialogs = 0;
  for (const page of [annaPage, benPage]) page.on('dialog', () => dialogs++);

  await add(annaPage, markup);
  await expect(row(benPage, markup).locator('.text')).toHaveText(markup);
  await expect(row(annaPage, markup).locator('.text')).toHaveText(markup);
  await expect(benPage.locator('#items img')).toHaveCount(0);
  expect(dialogs).toBe(0);
});

test('given empty or whitespace text, when adding, then no item is created', async ({ annaPage, benPage }) => {
  await add(annaPage, '   ');
  await add(annaPage, '');
  await expect(annaPage.getByText('Die Liste ist leer.')).toBeVisible();
  expect(await listItems()).toHaveLength(0);
});

test('given an item whose creator account was removed, then it shows "Unbekannt"', async ({ annaPage, benPage }) => {
  const dora = await createUser(server, 'Dora');
  await createItem(dora, 'Salz');
  await api(server.url, `/api/collections/users/records/${dora.id}`, { method: 'DELETE', token: server.superuserToken });

  await annaPage.reload();
  await expect(row(annaPage, 'Salz').locator('.meta')).toHaveText('von Unbekannt');
});
