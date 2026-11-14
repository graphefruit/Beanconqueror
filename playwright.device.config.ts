import { defineConfig } from '@playwright/test';

/**
 * Measurements of the debug app on an Android phone over ADB (`pnpm e2e:device`, see
 * DEVELOPING.md, "Device tests"). Not part of `pnpm e2e`: the specs end in `.device.ts`, which the
 * default config does not match. The tests start no browser and no server; they connect to the
 * app's WebView themselves (e2e/device/device.ts).
 */
export default defineConfig({
  testDir: './e2e/device',
  testMatch: /\.device\.ts$/,
  outputDir: './test-results/device',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
