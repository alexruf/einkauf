import { test, expect, users, deleteAllItems, row } from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

test('given the content security policy, when using the app, then no violation is reported', async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.cspViolations.push(`${e.violatedDirective}: ${e.blockedURI}`);
    });
  });
  const consoleErrors = [];
  page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()));
  const violations = () => page.evaluate(() => window.cspViolations);

  await page.goto('/');
  await page.getByLabel('E-Mail').fill(anna.email);
  await page.getByLabel('Passwort').fill(anna.password);
  await page.getByRole('button', { name: 'Anmelden' }).click();

  await page.getByLabel('Neuer Eintrag').fill('Milch');
  await page.keyboard.press('Enter');
  await row(page, 'Milch').getByRole('checkbox').check();
  await row(page, 'Milch').getByRole('checkbox').uncheck();
  await row(page, 'Milch').getByRole('button', { name: 'Löschen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(row(page, 'Milch')).toHaveCount(0);
  await page.getByRole('button', { name: 'Abmelden' }).click();
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();

  expect(await violations()).toEqual([]);
  expect(consoleErrors).toEqual([]);

  // Positive control: an inline script is blocked and reported, so the
  // listener above would have caught real violations.
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.inlineRan = true';
    document.body.append(script);
  });
  await expect.poll(violations).toContainEqual(expect.stringContaining('script-src'));
  expect(await page.evaluate(() => window.inlineRan)).toBeUndefined();
});
