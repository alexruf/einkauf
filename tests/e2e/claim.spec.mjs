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
  waitForServiceWorker,
} from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

// The button's name says what a tap does, so it changes with the state.
const claimButton = (page, text) => row(page, text).locator('button.claim');

test('given an open item, when Anna claims it, then she sees her claim and Ben sees it as hers', async ({
  annaPage,
  benPage,
}) => {
  await createItem(ben, 'Milch');
  await annaPage.reload();
  await benPage.reload();

  await expect(claimButton(annaPage, 'Milch')).toHaveAccessibleName('Besorge ich');
  await claimButton(annaPage, 'Milch').click();

  await expect(row(annaPage, 'Milch').locator('.meta')).toHaveText('Du besorgst das');
  await expect(row(annaPage, 'Milch')).toHaveAttribute('data-claim', 'mine');
  await expect(claimButton(annaPage, 'Milch')).toHaveAccessibleName('Markierung entfernen');

  await expect(row(benPage, 'Milch').locator('.meta')).toHaveText('Anna besorgt das', { timeout: 5000 });
  await expect(row(benPage, 'Milch')).toHaveAttribute('data-claim', 'other');
  await expect(claimButton(benPage, 'Milch')).toHaveAccessibleName('Markierung von Anna entfernen');
  await expect.poll(async () => (await listItems())[0].claimedBy).toBe(anna.id);
});

test('given Anna claimed an item, when Ben taps it twice, then he first removes her claim and then claims it', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Brot');
  await annaPage.reload();
  await benPage.reload();
  await claimButton(annaPage, 'Brot').click();
  await expect(row(benPage, 'Brot')).toHaveAttribute('data-claim', 'other', { timeout: 5000 });

  await claimButton(benPage, 'Brot').click();
  await expect(row(benPage, 'Brot')).not.toHaveAttribute('data-claim');
  await expect(row(benPage, 'Brot').locator('.meta')).toHaveText('von Anna · zuletzt Ben');
  await expect(row(annaPage, 'Brot')).not.toHaveAttribute('data-claim', { timeout: 5000 });

  await claimButton(benPage, 'Brot').click();
  await expect(row(benPage, 'Brot')).toHaveAttribute('data-claim', 'mine');
  await expect(row(annaPage, 'Brot').locator('.meta')).toHaveText('Ben besorgt das', { timeout: 5000 });
});

test('given a claimed item, when it is checked off, then the claim is gone and the row has no claim button', async ({
  annaPage,
}) => {
  await createItem(anna, 'Käse');
  await annaPage.reload();
  await claimButton(annaPage, 'Käse').click();
  await expect(row(annaPage, 'Käse')).toHaveAttribute('data-claim', 'mine');

  await row(annaPage, 'Käse').getByRole('checkbox').check();

  await expect(row(annaPage, 'Käse')).not.toHaveAttribute('data-claim');
  await expect(claimButton(annaPage, 'Käse')).toBeHidden();
  await expect.poll(async () => (await listItems()).map((i) => [i.checked, i.claimedBy])).toEqual([[true, '']]);
});

test('given Anna is offline, when she claims an item, then it shows as not synchronized and Ben sees it after she reconnects', async ({
  annaPage,
  benPage,
}) => {
  await createItem(ben, 'Mehl');
  await annaPage.reload();
  await benPage.reload();
  await expect(row(annaPage, 'Mehl')).toBeVisible();
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await expect(annaPage.getByRole('status')).toContainText('Offline');

  await claimButton(annaPage, 'Mehl').click();

  await expect(row(annaPage, 'Mehl')).toHaveAttribute('data-claim', 'mine');
  await expect(row(annaPage, 'Mehl').locator('.pending')).toBeVisible();
  expect((await listItems())[0].claimedBy).toBe('');

  await goOnline(annaPage);

  await expect(row(benPage, 'Mehl').locator('.meta')).toHaveText('Anna besorgt das', { timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0, { timeout: 10000 });
});

test('given Anna claimed an item, when she taps the hand again, then her claim is removed', async ({
  annaPage,
  benPage,
}) => {
  await createItem(ben, 'Senf');
  await annaPage.reload();
  await benPage.reload();
  await claimButton(annaPage, 'Senf').click();
  await expect(row(benPage, 'Senf')).toHaveAttribute('data-claim', 'other', { timeout: 5000 });

  await claimButton(annaPage, 'Senf').click();

  await expect(row(annaPage, 'Senf')).not.toHaveAttribute('data-claim');
  await expect(claimButton(annaPage, 'Senf')).toHaveAccessibleName('Besorge ich');
  await expect(row(benPage, 'Senf')).not.toHaveAttribute('data-claim', { timeout: 5000 });
  await expect.poll(async () => (await listItems())[0].claimedBy).toBe('');
});
