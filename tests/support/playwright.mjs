// The nixpkgs Playwright wrapper exposes @playwright/test only through
// NODE_PATH, which ES module imports ignore. Loading it with require keeps
// test files as ES modules without needing node_modules.

import { createRequire } from 'node:module';

const base = createRequire(import.meta.url)('@playwright/test');

export const { defineConfig, devices, expect } = base;

// The server is started in global setup, after the config was evaluated, so
// its URL reaches the tests through the environment.
export const test = base.test.extend({
  baseURL: async ({}, use) => {
    await use(process.env.EINKAUF_URL);
  },
});
