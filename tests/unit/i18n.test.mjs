import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createI18n } from '../../pb_public/js/i18n.js';

const messages = {
  plain: 'Speichern',
  'claim.other': '{name} besorgt das',
  'meta.edited': 'von {creator} · zuletzt {editor}',
  'sync.sending': { one: 'Sende {count} Änderung', other: 'Sende {count} Änderungen' },
  'sync.sendingOne': { one: 'Sende eine Änderung', other: 'Sende {count} Änderungen' },
  'broken.plural': { one: 'Eine' },
  'account.signedInAs': 'Angemeldet als {name}',
  'name.first': '{name} ist angemeldet',
  'name.only': '{name}',
};
const { t, tParts, formatTime, formatDate } = createI18n({ locale: 'de', messages });

test('given a plain text, then it is returned as is', () => {
  assert.equal(t('plain'), 'Speichern');
});

test('given a placeholder, then it is replaced by the param', () => {
  assert.equal(t('claim.other', { name: 'Anna' }), 'Anna besorgt das');
});

test('given several placeholders, then each is replaced by its own param', () => {
  assert.equal(t('meta.edited', { creator: 'Anna', editor: 'Ben' }), 'von Anna · zuletzt Ben');
});

test('given a param holding braces, then it is inserted literally', () => {
  assert.equal(t('claim.other', { name: '{editor}' }), '{editor} besorgt das');
});

test('given plural forms, then the count picks the form by the language rules', () => {
  assert.equal(t('sync.sending', { count: 1 }), 'Sende 1 Änderung');
  assert.equal(t('sync.sending', { count: 0 }), 'Sende 0 Änderungen');
  assert.equal(t('sync.sending', { count: 2 }), 'Sende 2 Änderungen');
});

test('given a plural form without the count placeholder, then the count is still accepted', () => {
  assert.equal(t('sync.sendingOne', { count: 1 }), 'Sende eine Änderung');
});

test('given a missing key, then it throws naming the key', () => {
  assert.throws(() => t('nope'), /nope/);
});

test('given a placeholder without a param, then it throws naming the key and placeholder', () => {
  assert.throws(() => t('claim.other'), /claim\.other.*name/);
});

test('given a param the text has no placeholder for, then it throws naming the key and param', () => {
  assert.throws(() => t('plain', { name: 'Anna' }), /plain.*name/);
});

test('given plural forms without a count, then it throws naming the key', () => {
  assert.throws(() => t('sync.sending'), /sync\.sending/);
});

test('given plural forms without an other form, then it throws naming the key', () => {
  assert.throws(() => t('broken.plural', { count: 1 }), /broken\.plural/);
});

test('given a placeholder in the middle or at the end, then tParts splits text and placeholder', () => {
  assert.deepEqual(tParts('account.signedInAs'), ['Angemeldet als ', { name: 'name' }]);
});

test('given a placeholder at the start, then tParts puts it first', () => {
  assert.deepEqual(tParts('name.first'), [{ name: 'name' }, ' ist angemeldet']);
});

test('given only a placeholder, then tParts returns just the placeholder', () => {
  assert.deepEqual(tParts('name.only'), [{ name: 'name' }]);
});

test('given a missing key, then tParts throws naming the key', () => {
  assert.throws(() => tParts('nope'), /nope/);
});

test('given a time, then it is formatted with two-digit hour and minute', () => {
  assert.equal(formatTime(new Date(2026, 9, 15, 9, 5)), '09:05');
  assert.equal(formatTime(new Date(2026, 9, 15, 17, 45)), '17:45');
});

test('given a date without the year, then it is formatted as day and month', () => {
  assert.equal(formatDate(new Date(2026, 9, 5, 9, 10)), '05.10.');
});

test('given a date with the year, then the year has two digits', () => {
  assert.equal(formatDate(new Date(2025, 11, 30, 17, 45), { year: true }), '30.12.25');
});
