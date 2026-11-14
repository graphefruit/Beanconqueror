import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

/**
 * Browsers colour their toolbar from <meta name="theme-color">; native builds
 * paint status and navigation bar with the same token. Both must match the page
 * colour of the active mode, also when the app setting differs from the system.
 */
async function openSettings(page: Page): Promise<void> {
  await openFromProfile(page, 'Settings');
}

async function chooseThemeMode(page: Page, mode: string): Promise<void> {
  // Opened by keyboard: Ionic's label overlays the native button for pointers.
  await page.getByRole('button', { name: /^Theme mode,/ }).press('Enter');
  await page.getByRole('radio', { name: mode }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Every theme-color tag, so a stale media variant cannot hide behind the first one. */
async function themeColors(page: Page): Promise<string[]> {
  return page
    .locator('meta[name="theme-color"]')
    .evaluateAll((metas) =>
      metas.map((meta) => (meta as HTMLMetaElement).content),
    );
}

/** The page colour as the browser renders it, as #rrggbb. */
async function pageColour(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.color = 'var(--bq-surface-page)';
    document.body.appendChild(probe);
    const [r, g, b] = getComputedStyle(probe)
      .color.match(/\d+/g)!
      .slice(0, 3)
      .map(Number);
    probe.remove();
    return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
  });
}

async function expectBarsMatchPage(page: Page, colour: string): Promise<void> {
  await expect.poll(() => themeColors(page)).toEqual([colour, colour]);
  expect(await pageColour(page)).toBe(colour);
}

const CREAM = '#ead9c4';
const ESPRESSO = '#211914';

test('theme-color follows the page colour of the chosen mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await completeFirstRun(page);
  await expectBarsMatchPage(page, CREAM);

  await openSettings(page);
  await chooseThemeMode(page, 'Dark mode');
  await expect(page.locator('html')).toHaveClass(/ion-palette-dark/);
  await expectBarsMatchPage(page, ESPRESSO);

  await chooseThemeMode(page, 'Light mode');
  await expect(page.locator('html')).not.toHaveClass(/ion-palette-dark/);
  await expectBarsMatchPage(page, CREAM);
});

test('theme-color follows the system scheme live in system mode', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await completeFirstRun(page);
  await openSettings(page);
  await chooseThemeMode(page, 'System default');
  await expectBarsMatchPage(page, CREAM);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expectBarsMatchPage(page, ESPRESSO);

  await page.emulateMedia({ colorScheme: 'light' });
  await expectBarsMatchPage(page, CREAM);
});

test('the static theme-color tags in index.html repeat the system bar tokens', async ({
  page,
}) => {
  await page.goto('/');
  const html = await (await page.request.get('/')).text();
  const { tags, tokens } = await page.evaluate((source) => {
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const root = getComputedStyle(document.documentElement);
    return {
      tags: [...parsed.querySelectorAll('meta[name="theme-color"]')].map(
        (meta) => [
          (meta as HTMLMetaElement).media,
          (meta as HTMLMetaElement).content.toLowerCase(),
        ],
      ),
      tokens: ['--bq-system-bar-light', '--bq-system-bar-dark'].map((name) =>
        root.getPropertyValue(name).trim().toLowerCase(),
      ),
    };
  }, html);
  expect(tokens).toEqual([CREAM, ESPRESSO]);
  expect(tags).toEqual([
    ['(prefers-color-scheme: light)', CREAM],
    ['(prefers-color-scheme: dark)', ESPRESSO],
  ]);
});
