import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suggest } from '../../pb_public/js/suggest.js';

const purchase = (text, count = 1) => ({ id: text, text, count });
const texts = (suggestions) => suggestions.map((s) => s.text);

test('given fewer than 2 characters, then nothing is suggested', () => {
  const purchases = [purchase('Milch', 5)];
  assert.deepEqual(suggest(purchases, 'm', []), []);
  assert.deepEqual(suggest(purchases, ' m ', []), []);
  assert.deepEqual(suggest(purchases, '', []), []);
});

test('given matches at word starts and inside words, then word starts come first, each by count', () => {
  const purchases = [purchase('Hafermilch', 5), purchase('Mineralwasser', 3), purchase('Milch', 14)];
  assert.deepEqual(texts(suggest(purchases, 'mi', [])), ['Milch', 'Mineralwasser', 'Hafermilch']);
});

test('given a later word or a hyphenated part starting with the query, then it counts as a word start', () => {
  const purchases = [purchase('Hafermilch', 9), purchase('Frische Milch', 1), purchase('Voll-Milch', 1)];
  assert.deepEqual(texts(suggest(purchases, 'mil', [])), ['Frische Milch', 'Voll-Milch', 'Hafermilch']);
});

test('given equal counts, then the texts are sorted alphabetically', () => {
  const purchases = [purchase('Brötchen', 2), purchase('Brot', 2), purchase('Brause', 2)];
  assert.deepEqual(texts(suggest(purchases, 'br', [])), ['Brause', 'Brot', 'Brötchen']);
});

test('given more than 5 matches, then the 5 highest-ranked are shown', () => {
  const purchases = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => purchase(`Sorte ${n}`, n));
  assert.deepEqual(texts(suggest(purchases, 'sorte', [])), ['Sorte 8', 'Sorte 7', 'Sorte 6', 'Sorte 5', 'Sorte 4']);
});

test('given a query in other case or with extra spaces, then it still matches', () => {
  const purchases = [purchase('Grüne Bohnen', 1)];
  assert.deepEqual(texts(suggest(purchases, 'GRÜNE  bo', [])), ['Grüne Bohnen']);
});

test('given no purchase contains the query, then nothing is suggested', () => {
  assert.deepEqual(suggest([purchase('Milch')], 'xy', []), []);
});

test('given an open item with the same text in other case or spacing, then the suggestion is on the list', () => {
  const purchases = [purchase('Milch', 2), purchase('Mineralwasser', 1)];
  const result = suggest(purchases, 'mi', [' milch ']);
  assert.deepEqual(result, [
    { text: 'Milch', onList: true },
    { text: 'Mineralwasser', onList: false },
  ]);
});

test('given an open item with a variant of the text, then the suggestion is not on the list', () => {
  const [result] = suggest([purchase('Milch')], 'mi', ['Milch 2x']);
  assert.equal(result.onList, false);
});

test('given no purchases, then nothing is suggested', () => {
  assert.deepEqual(suggest(undefined, 'milch', []), []);
});
