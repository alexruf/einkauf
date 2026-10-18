import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../../pb_public/js/version.js';

test('given the app version, then it has the form YYYY.0M.0D.MICRO', () => {
  assert.match(VERSION, /^\d{4}\.\d{2}\.\d{2}\.(0|[1-9]\d*)$/);
});

test('given the app version, then its date part is a real calendar date', () => {
  const [year, month, day] = VERSION.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate()], [year, month, day]);
});
