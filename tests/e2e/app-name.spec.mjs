import { api } from '../support/server.mjs';
import { test, expect, server, waitForServiceWorker, goOffline, goOnline } from '../support/e2e.mjs';

const setAppName = async (appName) => {
  const res = await api(server.url, '/api/settings', {
    method: 'PATCH',
    token: server.superuserToken,
    body: { meta: { appName } },
  });
  if (res.status !== 200) throw new Error(`Setting the app name failed: ${JSON.stringify(res.body)}`);
};

// All tests share one server, so the default name is restored for the others.
test.afterEach(() => setAppName('Einkauf'));

test('given an admin renamed the app, when opening the login screen, then header and title show the new name', async ({ page }) => {
  await setAppName('Familieneinkauf');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(page.locator('#app-name')).toHaveText('Familieneinkauf');
  await expect(page).toHaveTitle('Familieneinkauf');
});

test('given the renamed app was opened online, when it is opened offline, then header and title still show the new name', async ({ annaPage }) => {
  await setAppName('Familieneinkauf');
  await annaPage.reload();
  await expect(annaPage.locator('#app-name')).toHaveText('Familieneinkauf');
  await waitForServiceWorker(annaPage);

  await goOffline(annaPage);
  await annaPage.reload();
  await expect(annaPage.getByRole('status')).toHaveText('Offline – Änderungen werden später übertragen.');
  await expect(annaPage.locator('#app-name')).toHaveText('Familieneinkauf');
  await expect(annaPage).toHaveTitle('Familieneinkauf');
  await goOnline(annaPage);
});
