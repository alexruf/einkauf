import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newId } from '../../pb_public/js/ids.js';

test('given the default random source, when generating ids, then they match the PocketBase id pattern', () => {
  for (let i = 0; i < 1000; i++) {
    assert.match(newId(), /^[a-z0-9]{15}$/);
  }
});

test('given many generated ids, then they are distinct', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => newId()));
  assert.equal(ids.size, 1000);
});

test('given random bytes at the top of the range, when generating an id, then they are skipped', () => {
  const batches = [new Uint8Array(15).fill(255), new Uint8Array(15).fill(0)];
  const id = newId(() => batches.shift());
  assert.equal(id, 'a'.repeat(15));
});
