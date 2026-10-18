import { test, expect, users, deleteAllItems, createItem, openAs, row, listItems } from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

test.describe('on a 360 px wide phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('given a full list, then nothing scrolls horizontally and every tap target is at least 44 px', async ({ page }) => {
    await createItem(anna, 'Milch');
    await createItem(ben, 'Ein sehr langer Eintrag ohne Leerzeichen: ' + 'x'.repeat(150));
    await createItem(anna, 'Brot');
    await openAs(page, anna);
    await row(page, 'Brot').getByRole('checkbox').check();
    await expect(row(page, 'Brot')).toHaveClass(/is-checked/);
    // A claimed row has three buttons and a background that reaches past the
    // text, so it must still fit.
    await row(page, 'Milch').locator('button.claim').click();
    await expect(row(page, 'Milch')).toHaveAttribute('data-claim', 'mine');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    // A checkbox is tapped through its row, so the row is the target.
    const targets = page.locator('button:visible, input:not([type=checkbox]):visible, label.toggle');
    const count = await targets.count();
    expect(count).toBeGreaterThan(8);
    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox();
      const name = await targets.nth(i).evaluate((el) => el.outerHTML.slice(0, 80));
      expect(box.width, `width of ${name}`).toBeGreaterThanOrEqual(44);
      expect(box.height, `height of ${name}`).toBeGreaterThanOrEqual(44);
    }

    // Next to the claim, edit and delete buttons, the check-off area takes
    // the rest of the row.
    const rowBox = await row(page, 'Milch').boundingBox();
    const toggleBox = await row(page, 'Milch').locator('label.toggle').boundingBox();
    const buttonsWidth = await row(page, 'Milch').locator('button').evaluateAll((els) => els.reduce((sum, el) => sum + el.offsetWidth, 0));
    // The claimed row's padding is part of its box but not available to the label.
    const padding = await row(page, 'Milch').evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    });
    expect(toggleBox.width).toBeGreaterThanOrEqual(rowBox.width - padding - buttonsWidth - 16);

    // Tapping the text, far from the small checkbox, toggles the row.
    await row(page, 'Milch').locator('.text').tap();
    await expect(row(page, 'Milch').getByRole('checkbox')).toBeChecked();
  });

  test('given the login screen, then nothing scrolls horizontally', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('in a desktop browser', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('given the list, then it is a centered column and an item can be added by typing and Enter', async ({ page }) => {
    await openAs(page, anna);
    const input = page.getByLabel('Neuer Eintrag');
    await input.focus();
    await page.keyboard.type('Butter');
    await page.keyboard.press('Enter');

    await expect(row(page, 'Butter')).toBeVisible();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Butter']);

    const main = await page.locator('main').boundingBox();
    expect(main.width).toBeLessThanOrEqual(40 * 16);
    expect(Math.abs(main.x + main.width / 2 - 640)).toBeLessThanOrEqual(2);
  });
});
