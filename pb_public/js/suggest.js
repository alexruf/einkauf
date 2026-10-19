// Picks the past purchases to suggest while the user types a new item, and
// finds an open item that already has a typed text. Pure, so it can be tested
// without a browser.

const MIN_QUERY = 2;
const MAX_SUGGESTIONS = 5;

// Texts that differ only in case or spacing are the same purchase. The server
// builds its purchase key the same way in pb_hooks/purchases.js.
export const normalize = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

// items: the open items ([{ id, text }]). Returns the one whose text is the
// same as `text`, apart from the item `exceptId`, so an item being edited is
// never a duplicate of itself.
export function findOpenItem(items, text, exceptId) {
  const key = normalize(text);
  return items.find((item) => item.id !== exceptId && normalize(item.text) === key);
}

// True when the text or one of its words, separated by spaces or hyphens,
// starts with the query.
function startsWord(text, query) {
  for (let i = text.indexOf(query); i !== -1; i = text.indexOf(query, i + 1)) {
    if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '-') return true;
  }
  return false;
}

// purchases: [{ text, count }] from the snapshot; query: what the user typed;
// openTexts: the texts of the open items. Returns up to 5 [{ text, onList }],
// best first. A suggestion already on the list is returned with onList, so
// the app can show it but not add it twice.
export function suggest(purchases, query, openTexts) {
  const q = normalize(query);
  if (q.length < MIN_QUERY) return [];
  const open = new Set(openTexts.map(normalize));

  return (purchases ?? [])
    .map((p) => ({ ...p, key: normalize(p.text) }))
    .filter((p) => p.key.includes(q))
    .map((p) => ({ ...p, wordStart: startsWord(p.key, q) }))
    .sort((a, b) => b.wordStart - a.wordStart || b.count - a.count || a.text.localeCompare(b.text, 'de'))
    .slice(0, MAX_SUGGESTIONS)
    .map((p) => ({ text: p.text, onList: open.has(p.key) }));
}
