import { defineConfig, devices } from '@playwright/test';

import type { HarnessOptions } from './e2e/fixtures';

const PORT = Number(process.env['E2E_PORT'] ?? 4300);
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env['CI'];
const TABLET_SPECS = /tablet\.spec\.ts$/;
const PHONE_LANDSCAPE_SPECS = /phone-landscape\.spec\.ts$/;
// Lists whose scroller narrows once a classic scrollbar appears.
const SCROLLBAR_SPECS = /brew-list\.spec\.ts$/;
// Names, roles, focus and announcements also run in WebKit: VoiceOver on iOS reads what Safari exposes.
const A11Y_SPECS =
  /(a11y|accessibility|announcements|keyboard-focus|reading-order)[\w-]*\.spec\.ts$/;

/**
 * Browser E2E against the development build of `pnpm run build` (in `www`), served as it is.
 * Mobile emulation is not a native-device test: Capacitor plugins run their web fallbacks here.
 */
export default defineConfig<HarnessOptions>({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  // Fixed instead of the default (half the cores): locally several worktrees share one Mac, and on
  // the 4-vCPU CI runner half the cores (2) left the slowest shard at over 6 minutes.
  workers: 3,
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
      testIgnore: [TABLET_SPECS, PHONE_LANDSCAPE_SPECS],
    },
    // Tablet layout rules only: the journeys above do not change with the screen width.
    // The screen is set explicitly: the tablet rules depend on it, not on the viewport.
    {
      name: 'tablet-landscape-chromium',
      use: {
        ...devices['Galaxy Tab S4 landscape'],
        viewport: { width: 1024, height: 768 },
        screen: { width: 1024, height: 768 },
      },
      testMatch: TABLET_SPECS,
    },
    {
      name: 'tablet-portrait-chromium',
      use: {
        ...devices['Galaxy Tab S4'],
        viewport: { width: 768, height: 1024 },
        screen: { width: 768, height: 1024 },
      },
      testMatch: TABLET_SPECS,
    },
    // A phone turned sideways is as wide as a portrait tablet and must keep its phone layout.
    {
      name: 'pixel-7-landscape-chromium',
      use: { ...devices['Pixel 7 landscape'] },
      testMatch: PHONE_LANDSCAPE_SPECS,
    },
    // A desktop or a tablet with a mouse: the scrollbar takes width from the list.
    {
      name: 'desktop-scrollbars-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 },
        launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
        classicScrollbars: true,
      },
      testMatch: SCROLLBAR_SPECS,
    },
    {
      name: 'iphone-15-webkit',
      use: { ...devices['iPhone 15'] },
      testMatch: A11Y_SPECS,
    },
  ],
  // Serving the build instead of `ng serve` keeps the compile out of every run; under load the
  // compile ran into the start timeout. The server refuses a missing, production or outdated build.
  webServer: {
    command:
      'node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON e2e/tools/serve-build.ts',
    url: BASE_URL,
    // A dedicated port and no reuse, so tests never run against a stale manually started server.
    reuseExistingServer: false,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
