// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Meta-tests configuration for validating test suite quality
 */
module.exports = defineConfig({
  testDir: './',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'http-server -p 8000 -c-1',
    url: 'http://localhost:8000',
    cwd: path.resolve(__dirname, '../repository_after/kanban'),
    reuseExistingServer: !process.env.CI,
  },
});
