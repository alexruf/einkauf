import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createUpdater, parseVersion } from '../../pb_public/js/update.js';
import { VERSION } from '../../pb_public/js/version.js';
import { MemoryStorage } from '../support/memory-storage.mjs';

test('given the text of the real version file, when parsing it, then the version is returned', async () => {
  const text = await readFile(new URL('../../pb_public/js/version.js', import.meta.url), 'utf8');
  assert.equal(parseVersion(text), VERSION);
});

test('given an empty or unrelated text, when parsing it, then there is no version', () => {
  for (const text of ['', '<!doctype html><title>Einkauf</title>', "const VERSION = '2026.10.19.0';", undefined]) {
    assert.equal(parseVersion(text), null);
  }
});

test('given the running version is deployed, when trying to reload, then the app does not reload', () => {
  const updater = createUpdater({ running: '2026.10.19.0', backend: new MemoryStorage() });
  updater.found('2026.10.19.0');
  assert.equal(updater.takeReload(false), false);
});

test('given a new version was found and the app is idle, when trying to reload, then it reloads exactly once', () => {
  const updater = createUpdater({ running: '2026.10.19.0', backend: new MemoryStorage() });
  updater.found('2026.10.19.1');
  assert.equal(updater.takeReload(false), true);
  assert.equal(updater.takeReload(false), false);
});

test('given a new version was found while busy, when the app becomes idle, then it reloads', () => {
  const updater = createUpdater({ running: '2026.10.19.0', backend: new MemoryStorage() });
  updater.found('2026.10.19.1');
  assert.equal(updater.takeReload(true), false);
  assert.equal(updater.takeReload(false), true);
});

test('given the app already reloaded for a version but still runs the old code, when that version is found again, then it does not reload', () => {
  const window = new MemoryStorage();
  const before = createUpdater({ running: '2026.10.19.0', backend: window });
  before.found('2026.10.19.1');
  assert.equal(before.takeReload(false), true);

  const after = createUpdater({ running: '2026.10.19.0', backend: window });
  after.found('2026.10.19.1');
  assert.equal(after.takeReload(false), false);
});

test('given the app already reloaded for a version, when a newer version is found, then it reloads for that one', () => {
  const window = new MemoryStorage();
  const before = createUpdater({ running: '2026.10.19.0', backend: window });
  before.found('2026.10.19.1');
  before.takeReload(false);

  const after = createUpdater({ running: '2026.10.19.0', backend: window });
  after.found('2026.10.19.2');
  assert.equal(after.takeReload(false), true);
});
