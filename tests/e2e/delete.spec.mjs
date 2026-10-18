import { createItem, deleteAllItems, expect, listItems, row, test, users } from '../support/e2e.mjs';

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

test('given the device is offline, then deleting is shown as unavailable with a hint', async ({ annaPage }) => {
  await createItem(anna, 'Käse');
  await annaPage.reload();
  await startEditing(annaPage, 'Käse');
  await expect(deleteButton(annaPage)).toBeEnabled();
  await expect(editRow(annaPage).getByText('Löschen ist nur online möglich.')).toBeHidden();

  await annaPage.context().setOffline(true);
  await expect(deleteButton(annaPage)).toBeDisabled();
  await expect(editRow(annaPage).getByText('Löschen ist nur online möglich.')).toBeVisible();
  await expect(annaPage.getByRole('status')).toHaveText('Offline – Änderungen werden später übertragen.');

  await annaPage.context().setOffline(false);
  await expect(deleteButton(annaPage)).toBeEnabled({ timeout: 10000 });
});
