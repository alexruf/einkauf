import { test, expect, users, deleteAllItems, createItem, row, listItems } from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

const deleteButton = (page, text) => row(page, text).getByRole('button', { name: 'Löschen' });

test('given a checked-off item, when Anna deletes it, then it disappears for everyone without asking', async ({ annaPage, benPage }) => {
  await createItem(anna, 'Milch');
  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await expect(row(benPage, 'Milch').getByRole('checkbox')).toBeChecked();

  await deleteButton(annaPage, 'Milch').click();

  await expect(annaPage.getByRole('dialog')).toBeHidden();
  await expect(row(annaPage, 'Milch')).toHaveCount(0);
  await expect(row(benPage, 'Milch')).toHaveCount(0, { timeout: 5000 });
  expect(await listItems()).toHaveLength(0);
});

test('given an open item, when Anna deletes it and confirms, then it disappears for everyone', async ({ annaPage, benPage }) => {
  await createItem(anna, 'Brot');
  await annaPage.reload();

  await deleteButton(annaPage, 'Brot').click();
  const dialog = annaPage.getByRole('dialog');
  await expect(dialog).toContainText('„Brot“ ist noch nicht abgehakt. Wirklich löschen?');
  await dialog.getByRole('button', { name: 'Löschen' }).click();

  await expect(row(annaPage, 'Brot')).toHaveCount(0);
  await expect(row(benPage, 'Brot')).toHaveCount(0, { timeout: 5000 });
});

test('given an open item, when Anna starts deleting and cancels, then it stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await deleteButton(annaPage, 'Butter').click();
  await annaPage.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();

  await expect(annaPage.getByRole('dialog')).toBeHidden();
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect(await listItems()).toHaveLength(1);
});

test('given the device is offline, then deleting is not offered', async ({ annaPage }) => {
  await createItem(anna, 'Käse');
  await annaPage.reload();
  await expect(deleteButton(annaPage, 'Käse')).toBeEnabled();

  await annaPage.context().setOffline(true);
  await expect(deleteButton(annaPage, 'Käse')).toBeDisabled();
  await expect(annaPage.getByRole('status')).toHaveText('Offline – Änderungen werden später übertragen.');

  await annaPage.context().setOffline(false);
  await expect(deleteButton(annaPage, 'Käse')).toBeEnabled({ timeout: 10000 });
});
