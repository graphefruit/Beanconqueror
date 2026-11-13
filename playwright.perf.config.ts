import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4300);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Performance budgets with large synthetic data sets (`pnpm e2e:perf`, see DEVELOPING.md).
 * Not part of `pnpm e2e`: the specs end in `.perf.ts`, which the default config does not match.
 * Runs the optimized production build, one test at a time, so measurements do not compete for
 * the CPU.
 */
export default defineConfig({
  testDir: './e2e/perf',
  testMatch: /\.perf\.ts$/,
  outputDir: './test-results/perf',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/perf' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
    permissions: [],
    serviceWorkers: 'block',
    // Traces of 15,000 brews are large and slow the measured page down.
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      // The low-end reference device; its CPU is approximated by throttling (e2e/perf/perf.ts).
      name: 'pixel-2-xl-chromium',
      use: { ...devices['Pixel 2 XL'] },
    },
  ],
  webServer: {
    command: `pnpm exec ng serve --configuration production --port ${PORT} --no-hmr --no-live-reload`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
