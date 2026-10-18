import { createItem, deleteAllItems, expect, listItems, openAs, row, test, users } from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

async function askToLogOut(page) {
  await page.locator('.account-button').click();
  await page.getByRole('button', { name: 'Abmelden' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('on a 360 px wide phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('given a full list, then nothing scrolls horizontally and every tap target is at least 44 px', async ({
    page,
  }) => {
    await createItem(anna, 'Milch');
    await createItem(ben, `Ein sehr langer Eintrag ohne Leerzeichen: ${'x'.repeat(150)}`);
    await createItem(anna, 'Brot');
    await openAs(page, anna);
    await row(page, 'Brot').getByRole('checkbox').check();
    await expect(row(page, 'Brot')).toHaveClass(/is-checked/);
    // A claimed row has two buttons and a background that reaches past the
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

    // Next to the claim and more buttons, the check-off area takes
    // the rest of the row.
    const rowBox = await row(page, 'Milch').boundingBox();
    const toggleBox = await row(page, 'Milch').locator('label.toggle').boundingBox();
    const buttonsWidth = await row(page, 'Milch')
      .locator('button')
      .evaluateAll((els) => els.reduce((sum, el) => sum + el.offsetWidth, 0));
    // The claimed row's padding is part of its box but not available to the label.
    const padding = await row(page, 'Milch').evaluate((el) => {
      const style = getComputedStyle(el);
      return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    });
    expect(toggleBox.width).toBeGreaterThanOrEqual(rowBox.width - padding - buttonsWidth - 16);

    // A claimed row has the same edges as every other row.
    const claimed = await row(page, 'Milch').boundingBox();
    const other = await row(page, 'Ein sehr langer').boundingBox();
    expect(claimed.x).toBe(other.x);
    expect(claimed.width).toBe(other.width);

    // Tapping the text, far from the small checkbox, toggles the row.
    await row(page, 'Milch').locator('.text').tap();
    await expect(row(page, 'Milch').getByRole('checkbox')).toBeChecked();
  });

  for (const width of [320, 360]) {
    test(`given a row in edit mode at ${width} px, then the field and its buttons fit in the row`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      await createItem(anna, 'Milch');
      await openAs(page, anna);
      await row(page, 'Milch').getByRole('button', { name: 'Mehr' }).click();
      const editRow = page.locator('.item.is-editing');
      await expect(editRow).toBeVisible();

      const rowBox = await editRow.boundingBox();
      for (const control of await editRow.locator('input, button').all()) {
        const box = await control.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(rowBox.x);
        expect(box.x + box.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 0.5);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('given the login screen, then nothing scrolls horizontally', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('on a 390 px wide phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('given the logout confirmation, then it is a sheet anchored to the bottom', async ({ page }) => {
    await openAs(page, anna);
    const box = await (await askToLogOut(page)).boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(389);
    expect(Math.abs(box.y + box.height - 844)).toBeLessThanOrEqual(1);
  });

  test('given the logout confirmation, then no button starts out focused', async ({ page }) => {
    await openAs(page, anna);
    const dialog = await askToLogOut(page);
    await expect(dialog).toBeFocused();
  });
});

test.describe('in a desktop browser', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('given the list, then it is a centered column and an item can be added by typing and Enter', async ({
    page,
  }) => {
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

  test('given only the keyboard, then an item can be claimed, checked off and opened for editing', async ({ page }) => {
    await createItem(anna, 'Milch');
    await openAs(page, anna);
    const milch = row(page, 'Milch');
    await expect(milch).toBeVisible();

    // From the add field, Tab passes the "+" button and reaches the row.
    await page.getByLabel('Neuer Eintrag').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(milch.getByRole('checkbox')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(milch.locator('button.claim')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(milch).toHaveAttribute('data-claim', 'mine');

    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Space');
    await expect(milch.getByRole('checkbox')).toBeChecked();

    await page.keyboard.press('Tab');
    await expect(milch.getByRole('button', { name: 'Mehr' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('.item.is-editing').getByLabel('Eintrag')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.item.is-editing')).toHaveCount(0);
  });

  test('given the logout confirmation, then it is centered and closes on Escape', async ({ page }) => {
    await openAs(page, anna);
    const dialog = await askToLogOut(page);
    const box = await dialog.boundingBox();
    expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.y + box.height / 2 - 400)).toBeLessThanOrEqual(2);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
