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

const FONT = 'Atkinson Hyperlegible Next';

// The contrast ratio between an element's text color and a background, as
// defined by WCAG. Colors are read as the browser computed them.
function contrastIn(page, selector, background) {
  return page.evaluate(
    ([selector, background]) => {
      const rgb = (css) =>
        css
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
      const luminance = (css) => {
        const [r, g, b] = rgb(css).map((v) => {
          const c = v / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // Resolves a custom property such as --bg into a computed color.
      const probe = document.createElement('div');
      probe.style.color = `var(${background})`;
      document.body.append(probe);
      const back = getComputedStyle(probe).color;
      probe.remove();
      const front = getComputedStyle(document.querySelector(selector)).color;
      const [light, dark] = [luminance(front), luminance(back)].sort((a, b) => b - a);
      return (light + 0.05) / (dark + 0.05);
    },
    [selector, background],
  );
}

for (const colorScheme of ['light', 'dark']) {
  test.describe(`in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    // The plain `page` fixture, because only it follows the color scheme set here.
    test('given item and secondary texts, then items are at least 17 px and texts reach 4.5:1 contrast', async ({
      page,
    }) => {
      await createItem(anna, 'Milch');
      await openAs(page, anna);
      await expect(row(page, 'Milch').locator('.meta')).toBeVisible();

      // Polled, because a re-render can detach the element between lookup and
      // evaluation, and a detached element has no computed size.
      const text = row(page, 'Milch').locator('.text');
      await expect
        .poll(() => text.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)))
        .toBeGreaterThanOrEqual(17);

      for (const selector of ['.meta', '.version', '.done-toggle', '.indicator-text']) {
        for (const background of ['--bg', '--surface']) {
          const ratio = await contrastIn(page, selector, background);
          expect(ratio, `${selector} on ${background}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    });
  });
}

test('given the installed app is opened offline, then item text uses the app font', async ({ annaPage }) => {
  await createItem(anna, 'Milch 1l');
  await annaPage.reload();
  // The list must be stored on the device before the connection goes.
  await expect(row(annaPage, 'Milch 1l')).toBeVisible();
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await annaPage.reload();

  await expect(row(annaPage, 'Milch 1l')).toBeVisible();
  const loaded = await annaPage.evaluate(async (family) => {
    await document.fonts.ready;
    return [...document.fonts].some((face) => face.family.replaceAll('"', '') === family && face.status === 'loaded');
  }, FONT);
  expect(loaded).toBe(true);
  const family = await row(annaPage, 'Milch 1l')
    .locator('.text')
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain(FONT);
  await goOnline(annaPage);
});

test('given Anna checks off an item, then its strike-through is drawn, but not for an item Ben checks off', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Milch');
  await createItem(anna, 'Brot');
  await annaPage.reload();
  await benPage.reload();

  await row(annaPage, 'Milch').getByRole('checkbox').check();
  await expect(row(annaPage, 'Milch')).toHaveClass(/is-striking/);

  await row(benPage, 'Brot').getByRole('checkbox').check();
  await expect(row(annaPage, 'Brot').getByRole('checkbox')).toBeChecked({ timeout: 5000 });
  await expect(row(annaPage, 'Brot')).not.toHaveClass(/is-striking/);
});

test('given a checked checkbox, then it is drawn by the app and not as a native control', async ({ page }) => {
  await createItem(anna, 'Milch');
  await openAs(page, anna);
  const checkbox = row(page, 'Milch').getByRole('checkbox');
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  expect(await checkbox.evaluate((el) => getComputedStyle(el).appearance)).toBe('none');
});
