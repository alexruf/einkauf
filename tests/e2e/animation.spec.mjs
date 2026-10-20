import { createItem, deleteAllItems, expect, openAs, row, rows, test, users } from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

// Counts the animated renders, so a test can tell whether rows moved with or
// without a transition.
async function countTransitions(page) {
  await page.addInitScript(() => {
    window.transitions = 0;
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = (update) => {
      window.transitions += 1;
      return original(update);
    };
  });
}

async function checkOffFirst(page) {
  await createItem(anna, 'Milch');
  await createItem(anna, 'Brot');
  await openAs(page, anna);
  await expect(rows(page)).toHaveCount(2);
  const [first, second] = await rows(page).locator('.text').allTextContents();
  await row(page, first).getByRole('checkbox').check();
  // After the hold the checked-off row leaves the open list.
  await expect(page.locator('#items > li .text')).toHaveText([second]);
}

test('given the default motion setting, when a row moves, then the move is animated', async ({ page }) => {
  await countTransitions(page);
  await checkOffFirst(page);
  expect(await page.evaluate(() => window.transitions)).toBeGreaterThan(0);
});

test('given an item with a note is checked off, then one line is drawn across text and note', async ({ page }) => {
  await createItem(anna, 'Milch', { note: '2x' });
  await openAs(page, anna);
  await row(page, 'Milch').getByRole('checkbox').check();

  const text = row(page, 'Milch').locator('.text');
  await expect(row(page, 'Milch')).toHaveClass(/is-striking/);
  await expect(text.locator('.note')).toHaveText('· 2x');
  // The line is the background of .text, drawn by its animation. The note
  // inside it draws no line of its own, so the stroke runs on across it.
  expect(await text.evaluate((el) => getComputedStyle(el).animationName)).toBe('strike');
  await expect.poll(() => text.evaluate((el) => getComputedStyle(el).backgroundSize)).toBe('100% 2px');
  const note = await text
    .locator('.note')
    .evaluate((el) => [getComputedStyle(el).backgroundImage, getComputedStyle(el).animationName]);
  expect(note).toEqual(['none', 'none']);
});

test.describe('when the user prefers reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('given a row moves, then the new order is shown without a transition', async ({ page }) => {
    await countTransitions(page);
    await checkOffFirst(page);
    expect(await page.evaluate(() => window.transitions)).toBe(0);
  });

  test('given an item is checked off, then its strike-through appears at once, without being drawn', async ({
    page,
  }) => {
    await createItem(anna, 'Milch');
    await openAs(page, anna);
    await row(page, 'Milch').getByRole('checkbox').check();

    const text = row(page, 'Milch').locator('.text');
    await expect(row(page, 'Milch')).toHaveClass(/is-striking/);
    await expect
      .poll(() => text.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).backgroundSize]))
      .toEqual(['none', '100% 2px']);
  });
});
