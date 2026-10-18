import { VERSION } from '../../pb_public/js/version.js';
import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  openAs,
  row,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

const footer = (page) => page.getByRole('contentinfo');
const connection = (page) => page.locator('#connection-indicator');
const sync = (page) => page.locator('#sync-indicator');
const syncText = (page) => sync(page).locator('.indicator-text');

test('given the login screen, then the status bar shows the app version and no indicators', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
  await expect(footer(page)).toContainText(VERSION);
  await expect(footer(page)).not.toContainText(`v${VERSION}`);
  await expect(connection(page)).toBeHidden();
  await expect(sync(page)).toBeHidden();
});

test('given a logged-in user online with nothing to send, then only the green sync indicator and the version are shown', async ({
  annaPage,
}) => {
  await expect(sync(annaPage)).toHaveText('Synchronisiert');
  await expect(connection(annaPage)).toBeHidden();
  await expect(sync(annaPage)).toHaveAttribute('data-state', 'ok');
  await expect(footer(annaPage)).toContainText(VERSION);
});

test('given the connection is lost, then the indicators show offline and the last sync time while the offline notice stays', async ({
  annaPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();
  await expect(row(annaPage, 'Milch')).toBeVisible();
  await expect(sync(annaPage)).toHaveText('Synchronisiert');
  await waitForServiceWorker(annaPage);

  await goOffline(annaPage);

  await expect(annaPage.getByRole('status')).toContainText('Offline');
  await expect(connection(annaPage)).toHaveText('Offline');
  await expect(connection(annaPage)).toHaveAttribute('data-state', 'error');
  await expect(syncText(annaPage)).toHaveText(/^Stand heute, \d{2}:\d{2}$/);
  await expect(sync(annaPage)).toHaveAttribute('data-state', 'idle');

  // The time survives a restart of the app while still offline.
  await annaPage.reload();
  await expect(syncText(annaPage)).toHaveText(/^Stand heute, \d{2}:\d{2}$/);
  await goOnline(annaPage);
});

test.describe('on a 360 px wide phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  // The longest texts each indicator shows in practice.
  const longest = [
    ['Verbinde …', 'Stand 30.12.25, 17:45'],
    ['Verbunden', 'Sende 12 Änderungen'],
    ['Offline', 'Noch nicht synchronisiert'],
  ];

  for (const [connectionText, syncText] of longest) {
    test(`given "${connectionText}" and "${syncText}", then the status bar shows both in full on one line`, async ({
      page,
    }) => {
      await openAs(page, anna);
      await expect(sync(page)).toHaveText('Synchronisiert');
      await page.evaluate(
        ([c, s]) => {
          // Both indicators are shown together whenever the app is not fully synchronized.
          document.querySelector('#connection-indicator').hidden = false;
          document.querySelector('#connection-indicator .indicator-text').textContent = c;
          document.querySelector('#sync-indicator .indicator-text').textContent = s;
        },
        [connectionText, syncText],
      );

      const layout = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.footer-inner > :not([hidden])')].map((el) =>
          el.getBoundingClientRect(),
        );
        const texts = [...document.querySelectorAll('.footer .indicator-text')];
        return {
          // On one line, the vertically centered items share their middle.
          middles: items.map((box) => box.top + box.height / 2),
          cutOff: texts.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.textContent),
          overflow: document.documentElement.scrollWidth - window.innerWidth,
        };
      });
      expect(layout.middles).toHaveLength(3);
      expect(Math.max(...layout.middles) - Math.min(...layout.middles)).toBeLessThan(2);
      expect(layout.cutOff).toEqual([]);
      expect(layout.overflow).toBeLessThanOrEqual(0);
    });
  }
});
