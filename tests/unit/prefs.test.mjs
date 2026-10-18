import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPrefs } from '../../pb_public/js/prefs.js';
import { createStore } from '../../pb_public/js/storage.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

test('given a new device, then the "Erledigt" section is collapsed', () => {
  assert.equal(createPrefs(new MemoryStorage()).doneOpen(), false);
});

test('given the section was opened, when the page reloads, then it is still open', () => {
  const device = new MemoryStorage();
  createPrefs(device).setDoneOpen(true);
  assert.equal(createPrefs(device).doneOpen(), true);
});

test('given the section was opened and closed again, then it is collapsed', () => {
  const prefs = createPrefs(new MemoryStorage());
  prefs.setDoneOpen(true);
  prefs.setDoneOpen(false);
  assert.equal(prefs.doneOpen(), false);
});

test('given the section was opened, when the user logs out, then it stays open on this device', () => {
  const device = new MemoryStorage();
  createPrefs(device).setDoneOpen(true);
  const store = createStore(device);
  store.claim('anna');
  store.clear();
  assert.equal(createPrefs(device).doneOpen(), true);
});

test('given an unreadable stored value, then the section is collapsed', () => {
  const device = new MemoryStorage();
  device.setItem('einkauf-prefs', '{broken');
  assert.equal(createPrefs(device).doneOpen(), false);
});
