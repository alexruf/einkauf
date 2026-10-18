import { test, expect, users, deleteAllItems, createItem, row, listItems, waitForServiceWorker, goOffline, goOnline } from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

const editButton = (page, text) => row(page, text).getByRole('button', { name: 'Bearbeiten' });
const dialogInput = (page) => page.getByRole('dialog').getByLabel('Eintrag');

async function startEditing(page, text) {
  await editButton(page, text).click();
  await expect(dialogInput(page)).toHaveValue(text);
}

async function save(page, text) {
  await dialogInput(page).fill(text);
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
}

test('given an item, when Anna edits it, then everyone sees the new text with Anna as last editor', async ({ annaPage, benPage }) => {
  await createItem(ben, 'Milch');
  await annaPage.reload();

  await startEditing(annaPage, 'Milch');
  await save(annaPage, 'Hafermilch');

  await expect(row(annaPage, 'Hafermilch')).toBeVisible();
  await expect(row(benPage, 'Hafermilch')).toBeVisible({ timeout: 5000 });
  await expect(row(benPage, 'Hafermilch').locator('.meta')).toHaveText('von Ben · zuletzt Anna');
  expect((await listItems()).map((i) => i.text)).toEqual(['Hafermilch']);
});

test('given a checked-off item, when Anna edits it, then it stays checked off', async ({ annaPage }) => {
  await createItem(anna, 'Brot');
  await annaPage.reload();
  await row(annaPage, 'Brot').getByRole('checkbox').check();

  await startEditing(annaPage, 'Brot');
  await save(annaPage, 'Vollkornbrot');

  await expect(row(annaPage, 'Vollkornbrot').getByRole('checkbox')).toBeChecked();
  await expect.poll(async () => (await listItems()).map((i) => [i.text, i.checked])).toEqual([['Vollkornbrot', true]]);
});

test('given the edit dialog, when Anna cancels, then the text stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await dialogInput(annaPage).fill('Margarine');
  await annaPage.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

  await expect(annaPage.getByRole('dialog')).toBeHidden();
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

test('given the edit dialog, when Anna saves an empty or unchanged text, then nothing changes', async ({ annaPage }) => {
  await createItem(ben, 'Käse');
  await annaPage.reload();

  await startEditing(annaPage, 'Käse');
  await save(annaPage, '   ');
  await startEditing(annaPage, 'Käse');
  await save(annaPage, ' Käse ');

  await expect(row(annaPage, 'Käse')).toBeVisible();
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
  const [item] = await listItems();
  expect(item.text).toBe('Käse');
  expect(item.updatedBy).toBe(ben.id);
});

test('given the edit dialog, when Anna presses Enter, then the text is saved', async ({ annaPage }) => {
  await createItem(anna, 'Eier');
  await annaPage.reload();

  await startEditing(annaPage, 'Eier');
  await dialogInput(annaPage).fill('Eier 10x');
  await annaPage.keyboard.press('Enter');

  await expect(annaPage.getByRole('dialog')).toBeHidden();
  await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Eier 10x']);
});

test('given an open item, when Anna taps its text, then it is checked off and no dialog opens', async ({ annaPage }) => {
  await createItem(anna, 'Salz');
  await annaPage.reload();

  await row(annaPage, 'Salz').locator('.text').click();

  await expect(row(annaPage, 'Salz').getByRole('checkbox')).toBeChecked();
  await expect(annaPage.getByRole('dialog')).toBeHidden();
});

test('given Anna is offline, when she edits an item, then it shows as not synchronized and syncs when she reconnects', async ({ annaPage, benPage }) => {
  await createItem(ben, 'Mehl');
  await annaPage.reload();
  await expect(row(annaPage, 'Mehl')).toBeVisible();
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await expect(annaPage.getByRole('status')).toContainText('Offline');

  await startEditing(annaPage, 'Mehl');
  await save(annaPage, 'Dinkelmehl');

  await expect(row(annaPage, 'Dinkelmehl').locator('.pending')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Mehl']);

  await goOnline(annaPage);

  await expect(row(benPage, 'Dinkelmehl')).toBeVisible({ timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0, { timeout: 10000 });
});

test('given Anna is editing an item, when Ben deletes it, then her dialog closes', async ({ annaPage, benPage }) => {
  await createItem(ben, 'Zucker');
  await annaPage.reload();
  await benPage.reload();
  await row(benPage, 'Zucker').getByRole('checkbox').check();

  await startEditing(annaPage, 'Zucker');
  await row(benPage, 'Zucker').getByRole('button', { name: 'Löschen' }).click();

  await expect(annaPage.getByRole('dialog')).toBeHidden({ timeout: 5000 });
  await expect(row(annaPage, 'Zucker')).toHaveCount(0);
});
