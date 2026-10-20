import {
  createItem,
  deleteAllItems,
  expect,
  goOffline,
  goOnline,
  listItems,
  openAs,
  row,
  test,
  users,
  waitForServiceWorker,
} from '../support/e2e.mjs';

const { anna, ben } = users;

test.beforeEach(deleteAllItems);

const moreButton = (page, text) => row(page, text).getByRole('button', { name: 'Mehr' });
// The row in edit mode; there is at most one.
const editRow = (page) => page.locator('.item.is-editing');
const editField = (page) => editRow(page).getByLabel('Eintrag');

async function startEditing(page, text) {
  await moreButton(page, text).click();
  await expect(editField(page)).toHaveValue(text);
}

async function save(page, text) {
  await editField(page).fill(text);
  await editRow(page).getByRole('button', { name: 'Speichern' }).click();
  await expect(editRow(page)).toHaveCount(0);
}

test('given an item, when Anna edits it, then everyone sees the new text with Anna as last editor', async ({
  annaPage,
  benPage,
}) => {
  await createItem(ben, 'Milch');
  await annaPage.reload();

  await startEditing(annaPage, 'Milch');
  await save(annaPage, 'Hafermilch');

  await expect(row(annaPage, 'Hafermilch')).toBeVisible();
  await expect(row(benPage, 'Hafermilch')).toBeVisible({ timeout: 5000 });
  await expect(row(benPage, 'Hafermilch').locator('.meta')).toHaveText('von Ben · zuletzt Anna');
  expect((await listItems()).map((i) => i.text)).toEqual(['Hafermilch']);
});

test('given a checked-off item, when Anna edits it, then it stays checked off', async ({ annaPage }) => {
  await createItem(anna, 'Brot');
  await annaPage.reload();
  await row(annaPage, 'Brot').getByRole('checkbox').check();

  await startEditing(annaPage, 'Brot');
  await save(annaPage, 'Vollkornbrot');

  await expect(row(annaPage, 'Vollkornbrot').getByRole('checkbox')).toBeChecked();
  await expect.poll(async () => (await listItems()).map((i) => [i.text, i.checked])).toEqual([['Vollkornbrot', true]]);
});

test('given an item, when Anna clicks its more button, then the row opens in place with the cursor after the text', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');

  await expect(editField(annaPage)).toBeFocused();
  expect(await editField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([6, 6]);
  await expect(editRow(annaPage).getByRole('button', { name: 'Löschen' })).toBeVisible();
  await expect(editRow(annaPage).getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await expect(annaPage.getByRole('dialog')).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('given an item, when it is tapped open, then the field has focus so the keyboard opens at once', async ({
    page,
  }) => {
    await createItem(anna, 'Milch');
    await openAs(page, anna);

    await row(page, 'Milch').getByRole('button', { name: 'Mehr' }).tap();

    await expect(editField(page)).toBeFocused();
    expect(await editField(page).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([5, 5]);
  });
});

test('given a row partly under the header, when Anna opens it, then the edit row is scrolled below the header', async ({
  annaPage,
}) => {
  for (let i = 1; i <= 30; i++) await createItem(anna, `Sorte ${i}`);
  await annaPage.reload();
  await expect(row(annaPage, 'Sorte 30')).toBeVisible();
  // The top of "Sorte 15" slips under the header; its buttons stay clickable.
  await row(annaPage, 'Sorte 15').evaluate((li) => {
    const header = document.querySelector('header').getBoundingClientRect().bottom;
    window.scrollBy(0, li.getBoundingClientRect().top - (header - 20));
  });

  await startEditing(annaPage, 'Sorte 15');

  const gap = () =>
    editRow(annaPage).evaluate(
      (li) => li.getBoundingClientRect().top - document.querySelector('header').getBoundingClientRect().bottom,
    );
  await expect.poll(gap).toBeGreaterThanOrEqual(0);
});

test('given the edit mode, when Anna cancels, then the text stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await editRow(annaPage).getByRole('button', { name: 'Abbrechen' }).click();

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(moreButton(annaPage, 'Butter')).toBeFocused();
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

test('given the edit mode, when Anna presses Escape, then the text stays', async ({ annaPage }) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await annaPage.keyboard.press('Escape');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

// Some browser extensions use the first Escape to leave the field, so the
// page only sees the second one, with nothing focused.
test('given the edit mode, when the field loses focus and Anna presses Escape, then the edit is cancelled', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await editField(annaPage).blur();
  await annaPage.keyboard.press('Escape');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect(moreButton(annaPage, 'Butter')).toBeFocused();
  expect((await listItems()).map((i) => i.text)).toEqual(['Butter']);
});

test('given the edit mode, when Anna presses Escape in the add field, then the edit stays open', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await annaPage.getByLabel('Neuer Eintrag').fill('Brot');
  await annaPage.getByLabel('Neuer Eintrag').press('Escape');

  await expect(editField(annaPage)).toHaveValue('Margarine');
});

test('given the edit mode of one item, when Anna opens another, then the first closes without changes', async ({
  annaPage,
}) => {
  await createItem(anna, 'Butter');
  await createItem(anna, 'Brot');
  await annaPage.reload();

  await startEditing(annaPage, 'Butter');
  await editField(annaPage).fill('Margarine');
  await startEditing(annaPage, 'Brot');

  await expect(editRow(annaPage)).toHaveCount(1);
  await expect(row(annaPage, 'Butter')).toBeVisible();
  expect((await listItems()).map((i) => i.text).sort()).toEqual(['Brot', 'Butter']);
});

test('given the edit mode, when Anna saves an empty or unchanged text, then nothing changes', async ({ annaPage }) => {
  await createItem(ben, 'Käse');
  await annaPage.reload();

  await startEditing(annaPage, 'Käse');
  await save(annaPage, '   ');
  await startEditing(annaPage, 'Käse');
  await save(annaPage, ' Käse ');

  await expect(row(annaPage, 'Käse')).toBeVisible();
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
  const [item] = await listItems();
  expect(item.text).toBe('Käse');
  expect(item.updatedBy).toBe(ben.id);
});

test('given the edit mode, when Anna presses Enter, then the text is saved', async ({ annaPage }) => {
  await createItem(anna, 'Eier');
  await annaPage.reload();

  await startEditing(annaPage, 'Eier');
  await editField(annaPage).fill('Eier 10x');
  await annaPage.keyboard.press('Enter');

  await expect(editRow(annaPage)).toHaveCount(0);
  await expect.poll(async () => (await listItems()).map((i) => i.text)).toEqual(['Eier 10x']);
});

test('given an open item, when Anna taps its text, then it is checked off and no edit mode opens', async ({
  annaPage,
}) => {
  await createItem(anna, 'Salz');
  await annaPage.reload();

  await row(annaPage, 'Salz').locator('.text').click();

  await expect(row(annaPage, 'Salz').getByRole('checkbox')).toBeChecked();
  await expect(editRow(annaPage)).toHaveCount(0);
});

test('given Anna is offline, when she edits an item, then it shows as not synchronized and syncs when she reconnects', async ({
  annaPage,
  benPage,
}) => {
  await createItem(ben, 'Mehl');
  await annaPage.reload();
  await expect(row(annaPage, 'Mehl')).toBeVisible();
  await waitForServiceWorker(annaPage);
  await goOffline(annaPage);
  await expect(annaPage.getByRole('status')).toContainText('Offline');

  await startEditing(annaPage, 'Mehl');
  await save(annaPage, 'Dinkelmehl');

  await expect(row(annaPage, 'Dinkelmehl').locator('.pending')).toBeVisible();
  expect((await listItems()).map((i) => i.text)).toEqual(['Mehl']);

  await goOnline(annaPage);

  await expect(row(benPage, 'Dinkelmehl')).toBeVisible({ timeout: 10000 });
  await expect(annaPage.locator('.item.is-pending')).toHaveCount(0, { timeout: 10000 });
});

test('given Anna is editing an item, when Ben deletes it, then her edit mode closes', async ({ annaPage, benPage }) => {
  await createItem(ben, 'Zucker');
  await annaPage.reload();
  await benPage.reload();

  await startEditing(annaPage, 'Zucker');
  await moreButton(benPage, 'Zucker').click();
  await editRow(benPage).getByRole('button', { name: 'Löschen' }).click();

  await expect(editRow(annaPage)).toHaveCount(0, { timeout: 5000 });
  await expect(row(annaPage, 'Zucker')).toHaveCount(0);
});

test('given Anna is typing in the edit mode, when Ben adds an item, then her text and cursor stay', async ({
  annaPage,
  benPage,
}) => {
  await createItem(anna, 'Milch');
  await annaPage.reload();

  await startEditing(annaPage, 'Milch');
  await editField(annaPage).fill('Hafermilch');
  await editField(annaPage).evaluate((field) => field.setSelectionRange(4, 4));

  await benPage.getByLabel('Neuer Eintrag').fill('Eier');
  await benPage.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(row(annaPage, 'Eier')).toBeVisible({ timeout: 5000 });

  await expect(editField(annaPage)).toHaveValue('Hafermilch');
  await expect(editField(annaPage)).toBeFocused();
  expect(await editField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([4, 4]);
});

test('given Anna is editing an item, when Ben checks it off, then her row stays in place in edit mode', async ({
  annaPage,
  benPage,
}) => {
  for (const text of ['Milch', 'Brot', 'Salz']) await createItem(anna, text);
  await annaPage.reload();
  await benPage.reload();
  await expect(annaPage.locator('#items > li')).toHaveCount(3);
  const order = await annaPage.locator('#items > li').evaluateAll((items) => items.map((li) => li.dataset.id));

  await startEditing(annaPage, 'Milch');
  await row(benPage, 'Milch').getByRole('checkbox').check();
  await expect(row(benPage, 'Milch').getByRole('checkbox')).toBeChecked();
  await annaPage.waitForTimeout(2000);

  await expect(editField(annaPage)).toHaveValue('Milch');
  expect(await annaPage.locator('#items > li').evaluateAll((items) => items.map((li) => li.dataset.id))).toEqual(order);
});

test.describe('the note', () => {
  const noteField = (page) => editRow(page).getByLabel('Menge oder Hinweis');
  const saveButton = (page) => editRow(page).getByRole('button', { name: 'Speichern' });

  test('given an item with a note, when Anna opens it, then text and note are in two fields and the text field has focus', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch', { note: '2x' });
    await annaPage.reload();

    await startEditing(annaPage, 'Milch');

    await expect(noteField(annaPage)).toHaveValue('2x');
    await expect(editField(annaPage)).toBeFocused();
    expect(await editField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([5, 5]);
  });

  test('given an item without a note, when Anna opens it, then the empty note field says what it is for', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Brot');
    await annaPage.reload();

    await startEditing(annaPage, 'Brot');

    await expect(noteField(annaPage)).toHaveValue('');
    await expect(noteField(annaPage)).toHaveAttribute('placeholder', 'Menge oder Hinweis');
  });

  test('given an item by Anna, when Ben adds a note, then everyone sees it with Ben as last editor', async ({
    annaPage,
    benPage,
  }) => {
    await createItem(anna, 'Milch');
    await benPage.reload();

    await startEditing(benPage, 'Milch');
    await noteField(benPage).fill('2x');
    await saveButton(benPage).click();

    await expect(row(annaPage, 'Milch').locator('.text')).toHaveText('Milch · 2x', { timeout: 5000 });
    await expect(row(annaPage, 'Milch').locator('.meta')).toHaveText('von Anna · zuletzt Ben');
    const [item] = await listItems();
    expect([item.text, item.note]).toEqual(['Milch', '2x']);
  });

  test('given an item with a note, when Anna clears the note, then it is removed', async ({ annaPage }) => {
    await createItem(anna, 'Milch', { note: '2x' });
    await annaPage.reload();

    await startEditing(annaPage, 'Milch');
    await noteField(annaPage).fill('');
    await saveButton(annaPage).click();

    await expect(row(annaPage, 'Milch').locator('.text')).toHaveText('Milch');
    await expect.poll(async () => (await listItems())[0].note).toBe('');
  });

  test('given a separator in the text field, when Anna saves, then it stays in the text and the note is unchanged', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Joghurt', { note: 'Bio' });
    await annaPage.reload();

    await startEditing(annaPage, 'Joghurt');
    await save(annaPage, 'Joghurt, laktosefrei');

    await expect(row(annaPage, 'Joghurt').locator('.text')).toHaveText('Joghurt, laktosefrei · Bio');
    await expect
      .poll(async () => (await listItems()).map((i) => [i.text, i.note]))
      .toEqual([['Joghurt, laktosefrei', 'Bio']]);
  });

  test('given an empty text field and a new note, when Anna saves, then the text stays and the note is saved', async ({
    annaPage,
  }) => {
    await createItem(anna, 'Milch');
    await annaPage.reload();

    await startEditing(annaPage, 'Milch');
    await editField(annaPage).fill('');
    await noteField(annaPage).fill('2x');
    await saveButton(annaPage).click();

    await expect(row(annaPage, 'Milch').locator('.text')).toHaveText('Milch · 2x');
    await expect.poll(async () => (await listItems()).map((i) => [i.text, i.note])).toEqual([['Milch', '2x']]);
  });

  test('given an item with a note by Ben, when Anna saves without changes, then Ben stays last editor', async ({
    annaPage,
  }) => {
    await createItem(ben, 'Milch', { note: '2x' });
    await annaPage.reload();

    await startEditing(annaPage, 'Milch');
    await saveButton(annaPage).click();

    await expect(editRow(annaPage)).toHaveCount(0);
    await expect(annaPage.locator('.item.is-pending')).toHaveCount(0);
    const [item] = await listItems();
    expect([item.text, item.note, item.updatedBy]).toEqual(['Milch', '2x', ben.id]);
  });

  test('given the note field, when Anna presses Enter there, then the note is saved', async ({ annaPage }) => {
    await createItem(anna, 'Eier');
    await annaPage.reload();

    await startEditing(annaPage, 'Eier');
    await noteField(annaPage).fill('10');
    await noteField(annaPage).press('Enter');

    await expect(editRow(annaPage)).toHaveCount(0);
    await expect.poll(async () => (await listItems())[0].note).toBe('10');
  });

  test('given a checked-off item, when Anna adds a note, then it stays checked off', async ({ annaPage }) => {
    await createItem(anna, 'Brot');
    await annaPage.reload();
    await row(annaPage, 'Brot').getByRole('checkbox').check();

    await startEditing(annaPage, 'Brot');
    await noteField(annaPage).fill('Vollkorn');
    await saveButton(annaPage).click();

    await expect(row(annaPage, 'Brot').locator('.text')).toHaveText('Brot · Vollkorn');
    await expect(row(annaPage, 'Brot').getByRole('checkbox')).toBeChecked();
    await expect.poll(async () => (await listItems()).map((i) => [i.note, i.checked])).toEqual([['Vollkorn', true]]);
  });

  test('given Anna is typing a note, when Ben adds an item, then her text, note and cursor stay', async ({
    annaPage,
    benPage,
  }) => {
    await createItem(anna, 'Milch');
    await annaPage.reload();

    await startEditing(annaPage, 'Milch');
    await editField(annaPage).fill('Hafermilch');
    await noteField(annaPage).fill('2 Packungen');
    await noteField(annaPage).evaluate((field) => field.setSelectionRange(1, 1));

    await benPage.getByLabel('Neuer Eintrag').fill('Eier');
    await benPage.getByRole('button', { name: 'Hinzufügen' }).click();
    await expect(row(annaPage, 'Eier')).toBeVisible({ timeout: 5000 });

    await expect(editField(annaPage)).toHaveValue('Hafermilch');
    await expect(noteField(annaPage)).toHaveValue('2 Packungen');
    await expect(noteField(annaPage)).toBeFocused();
    expect(await noteField(annaPage).evaluate((field) => [field.selectionStart, field.selectionEnd])).toEqual([1, 1]);
  });
});
