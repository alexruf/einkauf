import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  listItems,
  openAs,
  rows,
  test,
  users,
} from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

const field = (page) => page.getByLabel('Neuer Eintrag');
// The row with exactly this text; `row` from the support module also matches
// "Milch 2x" for "Milch".
const exactRow = (page, text) =>
  rows(page).filter({ has: page.locator('.text', { hasText: new RegExp(`^${text}$`) }) });
const rowTexts = (page) => page.locator('.items > li .text');

async function add(page, text) {
  await field(page).fill(text);
  await field(page).press('Enter');
}

test.describe('adding', () => {
  test('given an open "Milch", when Anna adds "milch ", then nothing is added and "Milch" is pointed out', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch');
    await annaPage.reload();

    await add(annaPage, 'milch ');

    await expect(field(annaPage)).toHaveValue('');
    await expect(field(annaPage)).toBeFocused();
    await expect(exactRow(annaPage, 'Milch')).toHaveClass(/is-highlighted/);
    await expect(annaPage.getByRole('status')).toHaveText('„Milch“ steht schon drauf.');
    await expect(rowTexts(annaPage)).toHaveText(['Milch']);
    expect(await listItems()).toHaveLength(1);
  });

  test('given a highlighted row, when about 2 seconds pass, then the highlight ends', async ({ annaPage }) => {
    await createItem(anna, 'Milch');
    await annaPage.reload();

    await add(annaPage, 'Milch');
    await expect(exactRow(annaPage, 'Milch')).toHaveClass(/is-highlighted/);

    await expect(exactRow(annaPage, 'Milch')).not.toHaveClass(/is-highlighted/, { timeout: 4000 });
  });

  test('given a checked-off "Brot", when Anna adds "Brot", then an open "Brot" is added', async ({ annaPage }) => {
    await createItem(anna, 'Brot');
    await annaPage.reload();
    await exactRow(annaPage, 'Brot').getByRole('checkbox').check();
    await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

    await add(annaPage, 'Brot');

    await expect(exactRow(annaPage, 'Brot')).toHaveCount(2);
    await expect(annaPage.locator('.item.is-highlighted')).toHaveCount(0);
  });

  test('given an open "Milch", when Anna adds "Milch 2x", then it is added', async ({ annaPage }) => {
    await createItem(anna, 'Milch');
    await annaPage.reload();

    await add(annaPage, 'Milch 2x');

    await expect(rowTexts(annaPage)).toHaveText(['Milch', 'Milch 2x']);
  });

  test('given "Milch" is scrolled out of view, when Anna adds "Milch", then the list scrolls to it', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch');
    for (let i = 1; i <= 40; i++) await createItem(anna, `Sorte ${i}`);
    await annaPage.reload();
    await expect(rowTexts(annaPage)).toHaveCount(41);
    // Scrolls the page rather than a row, which a re-render may replace.
    await annaPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(exactRow(annaPage, 'Milch')).not.toBeInViewport();

    await add(annaPage, 'Milch');

    await expect(exactRow(annaPage, 'Milch')).toBeInViewport();
  });

  test('given the device is offline, when Anna adds "Käse" twice, then there is one row', async ({ annaPage }) => {
    await goOffline(annaPage);

    await add(annaPage, 'Käse');
    await expect(exactRow(annaPage, 'Käse')).toHaveClass(/is-pending/);
    await add(annaPage, 'Käse');

    await expect(exactRow(annaPage, 'Käse')).toHaveCount(1);
    await expect(exactRow(annaPage, 'Käse')).toHaveClass(/is-highlighted/);
  });
});

test.describe('when the user prefers reduced motion', () => {
  // Only the plain `page` fixture picks up the emulated setting.
  test.use({ reducedMotion: 'reduce' });

  test('given an open "Milch", when Anna adds it again, then the row is tinted at once, without fading', async ({
    page,
  }) => {
    await createItem(anna, 'Milch');
    await openAs(page, anna);

    await add(page, 'Milch');

    await expect(exactRow(page, 'Milch')).toHaveClass(/is-highlighted/);
    const [animation, background, notice] = await exactRow(page, 'Milch').evaluate((el) => {
      // Resolves --notice into the same rgb() form as the computed background.
      const probe = document.createElement('div');
      probe.style.background = 'var(--notice)';
      document.body.append(probe);
      const notice = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return [getComputedStyle(el).animationName, getComputedStyle(el).backgroundColor, notice];
    });
    expect(animation).toBe('none');
    expect(background).toBe(notice);
  });
});

test.describe('editing', () => {
  // The row in edit mode; there is at most one.
  const editRow = (page) => page.locator('.item.is-editing');
  const editField = (page) => editRow(page).getByLabel('Eintrag');

  async function saveAs(page, from, to) {
    await exactRow(page, from).getByRole('button', { name: 'Mehr' }).click();
    await editField(page).fill(to);
    await editRow(page).getByRole('button', { name: 'Speichern' }).click();
  }

  test('given open "Milch" and "Brot", when Anna saves "Brot" as "MILCH", then nothing is saved and "Milch" is pointed out', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch');
    await createItem(anna, 'Brot');
    await annaPage.reload();

    await saveAs(annaPage, 'Brot', 'MILCH');

    await expect(editField(annaPage)).toHaveValue('MILCH');
    await expect(editField(annaPage)).toBeFocused();
    await expect(exactRow(annaPage, 'Milch')).toHaveClass(/is-highlighted/);
    await expect(annaPage.getByRole('status')).toHaveText('„Milch“ steht schon drauf.');
    expect((await listItems()).map((i) => i.text).sort()).toEqual(['Brot', 'Milch']);
  });

  test('given an open "milch", when Anna saves it as "Milch", then it is saved', async ({ annaPage }) => {
    await createItem(anna, 'milch');
    await annaPage.reload();

    await saveAs(annaPage, 'milch', 'Milch');

    await expect(editRow(annaPage)).toHaveCount(0);
    await expect(rowTexts(annaPage)).toHaveText(['Milch']);
  });

  test('given a checked-off "Brot", when Anna saves an open "Brötchen" as "Brot", then it is saved', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Brot');
    await createItem(anna, 'Brötchen');
    await annaPage.reload();
    await exactRow(annaPage, 'Brot').getByRole('checkbox').check();
    await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

    await saveAs(annaPage, 'Brötchen', 'Brot');

    await expect(editRow(annaPage)).toHaveCount(0);
    await expect(exactRow(annaPage, 'Brot')).toHaveCount(2);
  });

  test('given an open "Milch", when Anna saves a checked-off "Milch 2x" as "Milch", then it is saved', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch');
    await createItem(anna, 'Milch 2x');
    await annaPage.reload();
    await exactRow(annaPage, 'Milch 2x').getByRole('checkbox').check();
    await expect(annaPage.locator('#sync-indicator')).toHaveAttribute('data-state', 'ok');

    await saveAs(annaPage, 'Milch 2x', 'Milch');

    await expect(editRow(annaPage)).toHaveCount(0);
    await expect(exactRow(annaPage, 'Milch')).toHaveCount(2);
    await expect(annaPage.locator('.item.is-highlighted')).toHaveCount(0);
  });
});
