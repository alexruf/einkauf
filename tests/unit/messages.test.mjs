import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { messages } from '../../pb_public/js/messages/de.js';

const PUBLIC_DIR = new URL('../../pb_public/', import.meta.url).pathname;

// Every key the markup and the code use. Keys are always string literals
// (see i18n.js), so reading the source finds all of them.
async function usedKeys() {
  const keys = new Set();
  const html = await readFile(join(PUBLIC_DIR, 'index.html'), 'utf8');
  for (const [, key] of html.matchAll(/data-i18n(?:-aria-label|-title|-placeholder)?="([^"]+)"/g)) keys.add(key);
  const dir = join(PUBLIC_DIR, 'js');
  const files = (await readdir(dir, { recursive: true })).filter((path) => path.endsWith('.js'));
  for (const file of files) {
    const code = await readFile(join(dir, file), 'utf8');
    // Biome keeps keys in single quotes, but a template literal without
    // placeholders is just as literal and must not slip past the check.
    for (const [, , key] of code.matchAll(/\b(?:t|tParts)\((['`])([\w.]+)\1/g)) keys.add(key);
  }
  return keys;
}

test('given the markup and the code, then every key they use is in the German catalog', async () => {
  const missing = [...(await usedKeys())].filter((key) => !Object.hasOwn(messages, key));
  assert.deepEqual(missing, [], `Keys missing from messages/de.js: ${missing.join(', ')}`);
});

test('given the German catalog, then the markup or the code uses every key', async () => {
  const used = await usedKeys();
  const unused = Object.keys(messages).filter((key) => !used.has(key));
  assert.deepEqual(unused, [], `Keys nobody uses in messages/de.js: ${unused.join(', ')}`);
});
