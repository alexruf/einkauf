import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  listItems,
  openAs,
  row,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

const moreButton = (page, text) => row(page, text).getByRole('button', { name: 'Mehr' });
// The row in edit mode; there is at most one.
const editRow = (page) => page.locator('.item.is-editing');
const editField = (page) => editRow(page).getByLabel('Eintrag');

async function startEditing(page, text) {
  await moreButton(page, text).click();
  await expect(editField(page)).toHaveValue(text);
}

async function save(page, text) {
  await editField(page).fill(text);
  await editRow(page).getByRole('button', { name: 'Speichern' }).click();
  await expect(editRow(page)).toHaveCount(0);
}

test('given an item, when Anna edits it, then everyone sees the new text with Anna as last editor', async ({
  annaPage,
  benPage,
}) => {
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

test('given an item, when Anna clicks its more button, then the row opens in place with the cursor after the text', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');

  await expect(editField(annaPage)).toBeFocused();
  expect(await editField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([6, 6]);
  await expect(editRow(annaPage).getByRole('button', { name: 'Löschen' })).toBeVisible();
  await expect(editRow(annaPage).getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect(annaPage.getByRole('dialog')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('given an item, when it is tapped open, then the field has focus so the keyboard opens at once', async ({
    page,
  }) => {
    await createItem(anna, 'Milch');
    await openAs(page, anna);

    await row(page, 'Milch').getByRole('button', { name: 'Mehr' }).tap();

    await expect(editField(page)).toBeFocused();
    expect(await editField(page).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([5, 5]);
  });
});

test('given the edit mode, when Anna cancels, then the text stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await editRow(annaPage).getByRole('button', { name: 'Abbrechen' }).click();

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(moreButton(annaPage, 'Butter')).toBeFocused();
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

test('given the edit mode, when Anna presses Escape, then the text stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await annaPage.keyboard.press('Escape');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

// Some browser extensions use the first Escape to leave the field, so the
// page only sees the second one, with nothing focused.
test('given the edit mode, when the field loses focus and Anna presses Escape, then the edit is cancelled', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await editField(annaPage).blur();
  await annaPage.keyboard.press('Escape');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(moreButton(annaPage, 'Butter')).toBeFocused();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

test('given the edit mode, when Anna presses Escape in the add field, then the edit stays open', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await annaPage.getByLabel('Neuer Eintrag').fill('Brot');
  await annaPage.getByLabel('Neuer Eintrag').press('Escape');

  await expect(editField(annaPage)).toHaveValue('Margarine');
});

test('given the edit mode of one item, when Anna opens another, then the first closes without changes', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await createItem(anna, 'Brot');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await startEditing(annaPage, 'Brot');

  await expect(editRow(annaPage)).toHaveCount(1);
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text).sort()).toEqual(['Brot', 'Butter']);
});

test('given the edit mode, when Anna saves an empty or unchanged text, then nothing changes', async ({ annaPage }) => {
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

test('given the edit mode, when Anna presses Enter, then the text is saved', async ({ annaPage }) => {
  await createItem(anna, 'Eier');
  await annaPage.reload();

  await startEditing(annaPage, 'Eier');
  await editField(annaPage).fill('Eier 10x');
  await annaPage.keyboard.press('Enter');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Eier 10x']);
});

test('given an open item, when Anna taps its text, then it is checked off and no edit mode opens', async ({
  annaPage,
}) => {
  await createItem(anna, 'Salz');
  await annaPage.reload();

  await row(annaPage, 'Salz').locator('.text').click();

  await expect(row(annaPage, 'Salz').getByRole('checkbox')).toBeChecked();
  await expect(editRow(annaPage)).toHaveCount(0);
});

test('given Anna is offline, when she edits an item, then it shows as not synchronized and syncs when she reconnects', async ({
  annaPage,
  benPage,
}) => {
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

test('given Anna is editing an item, when Ben deletes it, then her edit mode closes', async ({ annaPage, benPage }) => {
  await createItem(ben, 'Zucker');
  await annaPage.reload();
  await benPage.reload();

  await startEditing(annaPage, 'Zucker');
  await moreButton(benPage, 'Zucker').click();
  await editRow(benPage).getByRole('button', { name: 'Löschen' }).click();

  await expect(editRow(annaPage)).toHaveCount(0, { timeout: 5000 });
  await expect(row(annaPage, 'Zucker')).toHaveCount(0);
});

test('given Anna is typing in the edit mode, when Ben adds an item, then her text and cursor stay', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();

  await startEditing(annaPage, 'Milch');
  await editField(annaPage).fill('Hafermilch');
  await editField(annaPage).evaluate((field) => field.setSelectionRange(4, 4));

  await benPage.getByLabel('Neuer Eintrag').fill('Eier');
  await benPage.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(row(annaPage, 'Eier')).toBeVisible({ timeout: 5000 });

  await expect(editField(annaPage)).toHaveValue('Hafermilch');
  await expect(editField(annaPage)).toBeFocused();
  expect(await editField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([4, 4]);
});

test('given Anna is editing an item, when Ben checks it off, then her row stays in place in edit mode', async ({
  annaPage,
  benPage,
}) => {
  for (const text of ['Milch', 'Brot', 'Salz']) await createItem(anna, text);
  await annaPage.reload();
  await benPage.reload();
  await expect(annaPage.locator('#items > li')).toHaveCount(3);
  const order = await annaPage.locator('#items > li').evaluateAll((items) => items.map((li) => li.dataset.id));

  await startEditing(annaPage, 'Milch');
  await row(benPage, 'Milch').getByRole('checkbox').check();
  await expect(row(benPage, 'Milch').getByRole('checkbox')).toBeChecked();
  await annaPage.waitForTimeout(2000);

  await expect(editField(annaPage)).toHaveValue('Milch');
  expect(await annaPage.locator('#items > li').evaluateAll((items) => items.map((li) => li.dataset.id))).toEqual(order);
});
