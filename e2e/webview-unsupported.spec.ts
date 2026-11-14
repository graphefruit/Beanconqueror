import { expect, test } from '@playwright/test';

/**
 * Capacitor loads this page on Android instead of the app when the WebView is older than
 * `android.minWebViewVersion` or the app page fails to load (`server.errorPath`).
 * A static page without the app, so the app fixtures (native boundary) do not apply.
 */
const PAGE = '/assets/webview-unsupported.html';
const OLD_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 9; Pixel 2 XL Build/PPP3.180510.008; wv) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Version/4.0 Chrome/110.0.5481.153 Mobile Safari/537.36';

test.describe('with a WebView older than Chrome 119', () => {
  test.use({ userAgent: OLD_WEBVIEW });

  test('asks to update the WebView in Google Play', async ({ page }) => {
    await page.goto(PAGE);

    await expect(
      page.getByRole('heading', {
        name: 'Please update Android System WebView',
      }),
    ).toBeVisible();
    await expect(page.getByText('This device has version 110.')).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Open Google Play' }),
    ).toHaveAttribute(
      'href',
      'https://play.google.com/store/apps/details?id=com.google.android.webview',
    );
  });

  test.describe('in German', () => {
    test.use({ locale: 'de-DE' });

    test('explains the update in German', async ({ page }) => {
      await page.goto(PAGE);

      await expect(page.locator('html')).toHaveAttribute('lang', 'de');
      await expect(
        page.getByRole('heading', {
          name: 'Bitte Android System WebView aktualisieren',
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Google Play öffnen' }),
      ).toBeVisible();
    });
  });
});

test('offers a retry when the WebView is recent enough', async ({ page }) => {
  await page.goto(PAGE);

  await expect(
    page.getByRole('heading', { name: 'Beanconqueror could not be started' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute(
    'href',
    '/',
  );
});
