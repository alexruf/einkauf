import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  listItems,
  row,
  test,
  users,
} from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

const editRow = (page) => page.locator('.item.is-editing');
const deleteButton = (page) => editRow(page).getByRole('button', { name: 'Löschen' });

async function startEditing(page, text) {
  await row(page, text).getByRole('button', { name: 'Mehr' }).click();
  await expect(editRow(page).getByLabel('Eintrag')).toHaveValue(text);
}

test('given a checked-off item, when Anna deletes it, then it disappears for everyone without asking', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Milch');
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await expect(row(benPage, 'Milch').getByRole('checkbox')).toBeChecked();

  await startEditing(annaPage, 'Milch');
  await deleteButton(annaPage).click();

  await expect(annaPage.getByRole('dialog')).toHaveCount(0);
  await expect(row(annaPage, 'Milch')).toHaveCount(0);
  await expect(row(benPage, 'Milch')).toHaveCount(0, { timeout: 5000 });
  expect(await listItems()).toHaveLength(0);
});

test('given an open item, when Anna deletes it, then it disappears for everyone without a further question', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Brot');
  await annaPage.reload();

  await startEditing(annaPage, 'Brot');
  await deleteButton(annaPage).click();

  await expect(annaPage.getByRole('dialog')).toHaveCount(0);
  await expect(row(annaPage, 'Brot')).toHaveCount(0);
  await expect(row(benPage, 'Brot')).toHaveCount(0, { timeout: 5000 });
});

test('given the device is offline, when Anna deletes an item, then it disappears for her at once and for everyone after reconnecting', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Käse');
  await annaPage.reload();
  await expect(row(benPage, 'Käse')).toBeVisible();
  await goOffline(annaPage);
  await expect(annaPage.getByRole('status')).toHaveText('Offline – Änderungen werden später übertragen.');

  await startEditing(annaPage, 'Käse');
  await expect(deleteButton(annaPage)).toBeEnabled();
  await deleteButton(annaPage).click();

  await expect(row(annaPage, 'Käse')).toHaveCount(0);
  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'pending');
  await expect(row(benPage, 'Käse')).toBeVisible();
  expect(await listItems()).toHaveLength(1);

  await goOnline(annaPage);

  await expect(row(benPage, 'Käse')).toHaveCount(0, { timeout: 10000 });
  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok', { timeout: 10000 });
  await expect(row(annaPage, 'Käse')).toHaveCount(0);
  expect(await listItems()).toHaveLength(0);
});

test("given an item Anna added offline, when she deletes it, then it is in nobody's list after reconnecting", async ({
  annaPage,
  benPage,
}) => {
  await goOffline(annaPage);
  await annaPage.getByLabel('Neuer Eintrag').fill('Eier');
  await annaPage.keyboard.press('Enter');
  await expect(row(annaPage, 'Eier')).toBeVisible();

  await startEditing(annaPage, 'Eier');
  await expect(deleteButton(annaPage)).toBeEnabled();
  await deleteButton(annaPage).click();
  await expect(row(annaPage, 'Eier')).toHaveCount(0);

  await goOnline(annaPage);

  await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok', { timeout: 10000 });
  await expect(row(annaPage, 'Eier')).toHaveCount(0);
  await expect(row(benPage, 'Eier')).toHaveCount(0);
  expect(await listItems()).toHaveLength(0);
});
