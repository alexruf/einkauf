import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppName } from '../../pb_public/js/app-name.js';
import { createStore } from '../../pb_public/js/storage.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

test('given no stored name, when reading the name, then it is "Einkauf"', () => {
  assert.equal(createAppName(new MemoryStorage()).get(), 'Einkauf');
});

test('given a remembered name, when the page reloads, then the name is still there', () => {
  const device = new MemoryStorage();
  createAppName(device).remember('Familieneinkauf');
  assert.equal(createAppName(device).get(), 'Familieneinkauf');
});

test('given a remembered name, when an empty or non-string name arrives, then the remembered name is kept', () => {
  const appName = createAppName(new MemoryStorage());
  appName.remember('Familieneinkauf');
  for (const invalid of ['', '   ', undefined, null, 42, {}]) appName.remember(invalid);
  assert.equal(appName.get(), 'Familieneinkauf');
});

test('given a remembered name, when the user data is cleared on logout, then the name is kept', () => {
  const device = new MemoryStorage();
  const store = createStore(device);
  store.claim('anna');
  createAppName(device).remember('Familieneinkauf');
  store.clear();
  assert.equal(createAppName(device).get(), 'Familieneinkauf');
});
