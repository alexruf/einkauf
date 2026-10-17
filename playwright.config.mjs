import { defineConfig, devices } from './tests/support/playwright.mjs';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  globalSetup: './tests/support/global-setup.mjs',
  // All tests share one server; keep them sequential so they do not see each
  // other's items mid-test.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  reporter: 'list',
  outputDir: './test-results',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
