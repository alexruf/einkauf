import { expect, test } from '../support/e2e.mjs';

// The default headless shell does not evaluate installability and always
// reports no errors; the full Chromium build does.
test.use({ channel: 'chromium' });

// Playwright contexts are always incognito, where Chromium never offers to
// install. That is a property of the test browser, not of the app.
const installabilityErrors = async (cdp) =>
  (await cdp.send('Page.getInstallabilityErrors')).installabilityErrors
    .map((e) => e.errorId)
    .filter((id) => id !== 'in-incognito');

test('given the start page, then Chromium finds an installable standalone app with name and icons', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto('/');
  const cdp = await page.context().newCDPSession(page);

  const { errors, url } = await cdp.send('Page.getAppManifest');
  expect(url).toMatch(/\/manifest\.webmanifest$/);
  expect(errors).toEqual([]);

  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Einkauf');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const res = await page.request.get(icon.src);
    expect(res.ok(), icon.src).toBe(true);
  }

  await expect.poll(() => installabilityErrors(cdp), { timeout: 10000 }).toEqual([]);

  // Control: a page without a manifest is reported as not installable, so the
  // empty list above is a real result. It runs without the Service Worker,
  // which would otherwise answer the request with the app itself.
  const control = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  const controlPage = await control.newPage();
  await controlPage.route('**/no-manifest.html', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Kein Manifest</title>' }),
  );
  await controlPage.goto('/no-manifest.html');
  const controlCdp = await control.newCDPSession(controlPage);
  await expect.poll(() => installabilityErrors(controlCdp), { timeout: 10000 }).toContain('no-manifest');
  await control.close();
});
