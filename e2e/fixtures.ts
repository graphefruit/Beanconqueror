import { test as base, expect } from '@playwright/test';

import { NativeBoundary } from './support/native';

interface HarnessOptions {
  /** Console errors matching one of these patterns do not fail the test. Keep it empty if possible. */
  allowedConsoleErrors: RegExp[];
}

/**
 * Every test gets a fresh browser context (empty IndexedDB/localStorage, locale and permissions
 * from the config). Requests leaving the app origin are aborted so tests stay deterministic and
 * never send analytics or reach third-party services; a test that needs one must mock it with
 * `page.route`, which takes precedence over this guard.
 * Uncaught page errors, console errors and blocked requests fail the test and are attached
 * to the report.
 */
export const test = base.extend<
  HarnessOptions & { browserGuards: void; native: NativeBoundary }
>({
  allowedConsoleErrors: [[], { option: true }],

  /**
   * Capacitor/Cordova plugin boundary (see `support/native.ts`). Always installed so every test
   * records which native calls it makes; plugins are only faked when a test mocks them.
   */
  native: [
    async ({ page }, use, testInfo) => {
      const native = new NativeBoundary(page);
      await native.install();
      await use(native);
      expect(
        await native.finish(testInfo),
        'Native boundary violations',
      ).toEqual([]);
    },
    { auto: true },
  ],

  browserGuards: [
    async ({ context, page, baseURL, allowedConsoleErrors }, use, testInfo) => {
      const appOrigin = new URL(baseURL!).origin;
      const problems: string[] = [];

      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (
          url.startsWith(appOrigin) ||
          url.startsWith('data:') ||
          url.startsWith('blob:')
        ) {
          return route.continue();
        }
        problems.push(
          `blocked external request: ${route.request().method()} ${url} (mock it with page.route)`,
        );
        return route.abort('blockedbyclient');
      });

      page.on('pageerror', (error) =>
        problems.push(`pageerror: ${error.stack ?? error.message}`),
      );
      page.on('console', (message) => {
        const text = message.text();
        // Already reported above with method and URL.
        const isBlockedRequestEcho = text.includes('ERR_BLOCKED_BY_CLIENT');
        if (
          message.type() === 'error' &&
          !isBlockedRequestEcho &&
          !allowedConsoleErrors.some((pattern) => pattern.test(text))
        ) {
          const { url, lineNumber } = message.location();
          problems.push(`console.error: ${text}\n    at ${url}:${lineNumber}`);
        }
      });

      await use();

      if (problems.length > 0) {
        await testInfo.attach('browser-problems', {
          body: problems.join('\n\n'),
          contentType: 'text/plain',
        });
      }
      expect(
        problems,
        'Page errors, console errors or blocked external requests',
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
