// Splits what the user typed into the add field into an item's text and
// note, so "Milch, 2x" becomes the text "Milch" with the note "2x". Pure, so
// it can be tested without a browser.

const isDigit = (char) => char >= '0' && char <= '9';

// The note starts after the first semicolon, or after the first comma that
// is not a decimal comma: a comma with a digit on both sides, as in
// "Sahne 0,5 l", belongs to the text. Without a separator the whole entry is
// the text. So is an entry like ";2x" with nothing before the separator,
// because an item without a text makes no sense. Returns { text, note }, both
// trimmed.
export function splitEntry(entry) {
  for (let i = 0; i < entry.length; i++) {
    const char = entry[i];
    const decimal = char === ',' && isDigit(entry[i - 1] ?? '') && isDigit(entry[i + 1] ?? '');
    if (char === ';' || (char === ',' && !decimal)) {
      const text = entry.slice(0, i).trim();
      if (text) return { text, note: entry.slice(i + 1).trim() };
      break;
    }
  }
  return { text: entry.trim(), note: '' };
}
