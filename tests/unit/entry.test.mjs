import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitEntry } from '../../pb_public/js/entry.js';

// [what the user typed, expected text, expected note]
const cases = {
  'a comma': ['Milch, 2x', 'Milch', '2x'],
  'a semicolon without spaces': ['Milch;2x', 'Milch', '2x'],
  'a semicolon before a decimal comma': ['Sahne; 0,5', 'Sahne', '0,5'],
  'a comma before a decimal comma': ['Sahne, 0,5', 'Sahne', '0,5'],
  'a decimal comma without a separator': ['Sahne 0,5 l', 'Sahne 0,5 l', ''],
  'a decimal comma at the start': ['1,5 l Milch', '1,5 l Milch', ''],
  'a decimal comma before a semicolon': ['Sahne 0,5; Bio', 'Sahne 0,5', 'Bio'],
  'a comma after a number': ['Eier 10, Bio', 'Eier 10', 'Bio'],
  'a comma at the end after a number': ['Eier 10,', 'Eier 10', ''],
  'two separators': ['Joghurt; Erdbeer, Bio', 'Joghurt', 'Erdbeer, Bio'],
  'a separator without a note': ['Milch,', 'Milch', ''],
  'a semicolon at the start': [';2x', ';2x', ''],
  'a comma at the start': [',Milch', ',Milch', ''],
  'a comma after spaces only': ['  , 2x', ', 2x', ''],
  'no separator': ['Milch 2x', 'Milch 2x', ''],
  'spaces around both parts': ['  Milch ,  2x  ', 'Milch', '2x'],
  nothing: ['', '', ''],
};

for (const [name, [entry, text, note]] of Object.entries(cases)) {
  test(`given ${name}, when the entry "${entry}" is split, then the text is "${text}" and the note "${note}"`, () => {
    assert.deepEqual(splitEntry(entry), { text, note });
  });
}
