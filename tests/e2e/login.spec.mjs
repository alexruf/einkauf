import { createItem, deleteAllItems, users } from '../support/e2e.mjs';
import { expect, test } from '../support/playwright.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

async function logIn(page, email, password) {
  await page.getByLabel('E-Mail').fill(email);
  await page.getByLabel('Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden' }).click();
}

test('given no session, when opening the app, then only the login screen is shown and no list data', async ({
  page,
}) => {
  await createItem(anna, 'Geheime Milch');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(page.locator('#list-screen')).toBeHidden();
  await expect(page.getByText('Geheime Milch')).toHaveCount(0);
});

test('given valid credentials, when logging in, then the list and the own display name are shown but no email', async ({
  page,
}) => {
  await createItem(anna, 'Milch');
  await page.goto('/');
  await logIn(page, anna.email, anna.password);

  await expect(page.locator('#items').getByText('Milch')).toBeVisible();
  await expect(page.locator('#user-name')).toHaveText('Anna');
  await expect(page.locator('body')).not.toContainText(anna.email);
  await expect(page.locator('body')).not.toContainText('@');

  // Returning to the app later needs no credentials.
  const later = await page.context().newPage();
  await later.goto('/');
  await expect(later.locator('#items').getByText('Milch')).toBeVisible();
  await expect(later.getByRole('heading', { name: 'Anmelden' })).toBeHidden();
});

test('given a wrong password or an unknown email, when logging in, then the same German error is shown', async ({
  page,
}) => {
  await page.goto('/');
  await logIn(page, anna.email, 'falsches-passwort');
  const error = page.getByRole('alert');
  await expect(error).toHaveText('E-Mail oder Passwort ist falsch.');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();

  await logIn(page, 'niemand@example.test', 'falsches-passwort');
  await expect(error).toHaveText('E-Mail oder Passwort ist falsch.');
  await expect(page.locator('#list-screen')).toBeHidden();
});

test('given no session, when opening the app, then a collapsed install hint is shown and logging in works without opening it', async ({
  page,
}) => {
  await page.goto('/');
  const hint = page.locator('details.install-hint');
  await expect(hint.locator('summary')).toHaveText('App installieren');
  await expect(hint).not.toHaveAttribute('open');
  await expect(hint.getByText('iPhone / iPad (Safari)')).toBeHidden();

  await logIn(page, anna.email, anna.password);
  await expect(page.locator('#user-name')).toHaveText('Anna');
});

test('given the install hint, when expanding and collapsing it, then the steps for iPhone and Android appear and disappear', async ({
  page,
}) => {
  await page.goto('/');
  const hint = page.locator('details.install-hint');
  const summary = hint.locator('summary');

  await summary.click();
  await expect(hint.getByText('iPhone / iPad (Safari)')).toBeVisible();
  await expect(hint.getByText('Zum Home-Bildschirm')).toBeVisible();
  await expect(hint.getByText('Android (Chrome)')).toBeVisible();
  await expect(hint.locator('ol').nth(1)).toContainText('App installieren');

  await summary.click();
  await expect(hint.getByText('iPhone / iPad (Safari)')).toBeHidden();
});
