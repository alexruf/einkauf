import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../../pb_public/js/storage.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

test('given data stored for a user, when the page reloads, then the data is still there', () => {
  const device = new MemoryStorage();
  const first = createStore(device);
  first.claim('anna');
  first.set('outbox', [{ type: 'create' }]);

  const reloaded = createStore(device);
  assert.equal(reloaded.owner(), 'anna');
  assert.deepEqual(reloaded.get('outbox'), [{ type: 'create' }]);
});

test('given data stored for Anna, when Anna claims the storage again, then the data is kept', () => {
  const store = createStore(new MemoryStorage());
  store.claim('anna');
  store.set('outbox', [1]);
  store.claim('anna');
  assert.deepEqual(store.get('outbox'), [1]);
});

test('given data stored for Anna, when Ben claims the storage, then Anna\'s data is discarded', () => {
  const store = createStore(new MemoryStorage());
  store.claim('anna');
  store.set('outbox', [1]);
  store.set('snapshot', { items: [] });
  store.claim('ben');
  assert.equal(store.owner(), 'ben');
  assert.equal(store.get('outbox'), undefined);
  assert.equal(store.get('snapshot'), undefined);
});

test('given stored data, when the user logs out, then nothing is left', () => {
  const device = new MemoryStorage();
  const store = createStore(device);
  store.claim('anna');
  store.set('snapshot', { items: [{ id: 'x' }] });
  store.clear();
  assert.equal(createStore(device).owner(), null);
  assert.equal(createStore(device).get('snapshot'), undefined);
});

test('given no owner, when storing data, then it fails', () => {
  const store = createStore(new MemoryStorage());
  assert.throws(() => store.set('outbox', []), /claimed/);
});
