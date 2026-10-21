import { createItem, deleteAllItems, expect, row, test, users } from '../support/e2e.mjs';

const { anna } = users;

test.beforeEach(deleteAllItems);

test('given the markup as served, then it holds no text of its own apart from the app name', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  // DOMParser runs no scripts, so this sees the markup before the app fills
  // in the texts, including the contents of the templates.
  const texts = await page.evaluate((html) => {
    const found = [];
    const visit = (root) => {
      for (const element of root.querySelectorAll('*')) {
        if (element.matches('title, #app-name, script, style')) continue;
        for (const node of element.childNodes) {
          const text = node.nodeType === Node.TEXT_NODE && node.textContent.trim();
          if (text) found.push(`<${element.localName}> ${text}`);
        }
        for (const name of ['aria-label', 'title', 'placeholder', 'alt']) {
          const value = element.getAttribute(name);
          if (value) found.push(`<${element.localName} ${name}> ${value}`);
        }
        if (element.localName === 'template') visit(element.content);
      }
    };
    visit(new DOMParser().parseFromString(html, 'text/html'));
    return found;
  }, html);
  expect(texts).toEqual([]);
});

// The texts below come from the catalog. Most others are already checked by
// the tests of the features they belong to.

test('given the list, then the add field and its button are labelled', async ({ annaPage }) => {
  await expect(annaPage.getByLabel('Neuer Eintrag')).toHaveAttribute('placeholder', 'Was wird gebraucht?');
  await expect(annaPage.getByRole('button', { name: 'Hinzufügen' })).toHaveAttribute('title', 'Hinzufügen');
});

test('given an empty list, then the empty state asks what is needed next', async ({ annaPage }) => {
  await expect(annaPage.locator('#empty')).toHaveText('Alles erledigt. Was wird als Nächstes gebraucht?');
  await expect(annaPage.locator('#empty strong')).toHaveText('Alles erledigt.');
});

test('given an item, then its button for editing has the tooltip "Mehr"', async ({ annaPage }) => {
  await createItem(anna, 'Milch');
  await expect(row(annaPage, 'Milch').getByRole('button', { name: 'Mehr' })).toHaveAttribute('title', 'Mehr');
});

test('given the open account menu, then its header names the user in bold', async ({ annaPage }) => {
  await annaPage.getByRole('button', { name: anna.name }).click();
  const header = annaPage.locator('#account-menu .menu-header');
  await expect(header).toHaveText(`Angemeldet als ${anna.name}`);
  await expect(header.locator('strong')).toHaveText(anna.name);
});

test('given the login screen, when the install hint is expanded, then it explains the steps', async ({ page }) => {
  await page.goto('/');
  await page.getByText('App installieren', { exact: true }).click();
  const iphone = page.locator('.install-hint ol').first();
  await expect(iphone.locator('li').nth(2)).toHaveText('„Zum Home-Bildschirm“ wählen und mit „Hinzufügen“ bestätigen.');
});

test('given the app, then the page language is German', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});
