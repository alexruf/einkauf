import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox } from '../../pb_public/js/outbox.js';
import { createStore } from '../../pb_public/js/storage.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

function setup(device = new MemoryStorage()) {
  const store = createStore(device);
  store.claim('anna');
  let opCount = 0;
  const outbox = createOutbox(store, {
    now: () => '2026-10-17T10:00:00.000Z',
    makeId: () => `op${opCount++}`,
  });
  return { device, outbox };
}

test('given several changes, when listing the outbox, then they come in the order they were made', () => {
  const { outbox } = setup();
  outbox.add({ type: 'create', id: 'a', text: 'Milch' });
  outbox.add({ type: 'setChecked', id: 'b', checked: true });
  outbox.add({ type: 'setChecked', id: 'a', checked: true });
  assert.deepEqual(
    outbox.list().map((op) => [op.type, op.id]),
    [['create', 'a'], ['setChecked', 'b'], ['setChecked', 'a']],
  );
});

test('given a change, when added, then it records the local time of the action', () => {
  const { outbox } = setup();
  const op = outbox.add({ type: 'create', id: 'a', text: 'Milch' });
  assert.equal(op.at, '2026-10-17T10:00:00.000Z');
});

test('given pending changes, when the page reloads, then they are still pending in order', () => {
  const device = new MemoryStorage();
  setup(device).outbox.add({ type: 'create', id: 'a', text: 'Milch' });
  setup(device).outbox.add({ type: 'create', id: 'b', text: 'Brot' });
  const reloaded = createOutbox(createStore(device));
  assert.deepEqual(reloaded.list().map((op) => op.id), ['a', 'b']);
});

test('given pending changes, when one is removed, then only that one is gone', () => {
  const { outbox } = setup();
  const first = outbox.add({ type: 'create', id: 'a', text: 'Milch' });
  outbox.add({ type: 'setChecked', id: 'a', checked: true });
  outbox.remove(first);
  assert.deepEqual(outbox.list().map((op) => op.type), ['setChecked']);
});
