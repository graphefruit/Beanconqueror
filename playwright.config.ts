import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env['CI'];

/**
 * Browser E2E against the real Angular/Ionic app served by `ng serve`.
 * Mobile emulation is not a native-device test: Capacitor plugins run their web fallbacks here.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: isCI,
  // Flaky tests must be fixed, not retried into green.
  retries: 0,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    permissions: [],
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'pixel-7-chromium',
      use: { ...devices['Pixel 7'] },
    },
    // Add further projects deliberately, e.g. when a journey depends on WebKit or tablet layout:
    // { name: 'iphone-15-webkit', use: { ...devices['iPhone 15'] } },
    // { name: 'ipad-landscape-webkit', use: { ...devices['iPad Pro 11 landscape'] } },
  ],
  webServer: {
    command: `pnpm exec ng serve --port ${PORT} --no-hmr --no-live-reload`,
    url: BASE_URL,
    // A dedicated port and no reuse, so tests never run against a stale manually started server.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
