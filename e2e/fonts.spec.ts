import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

/**
 * Fonts Chromium actually rendered a piece of visible text with (DevTools
 * "Rendered fonts"); computed styles only list the requested families.
 */
async function renderedFontsOfText(page: Page, text: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  await cdp.send('DOM.getDocument');
  const { result } = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        if (node.data.trim() === ${JSON.stringify(text)} && element.checkVisibility()) {
          return element;
        }
      }
      return null;
    })()`,
  });
  expect(result.objectId, `visible text "${text}"`).toBeTruthy();
  const { nodeId } = await cdp.send('DOM.requestNode', {
    objectId: result.objectId!,
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  await cdp.detach();
  return fonts;
}

async function openSettings(page: Page): Promise<void> {
  await openFromProfile(page, 'Settings');
}

test('English text is set in the bundled Inter font', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);

  const inter = await page.evaluate(async () => {
    await document.fonts.ready;
    const faces = [...document.fonts].filter(
      (face) => face.family.replace(/"/g, '') === 'Inter',
    );
    return {
      check: document.fonts.check('16px Inter'),
      loaded: faces.some((face) => face.status === 'loaded'),
      bodyFamily: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(inter.loaded, 'Inter font face loaded').toBe(true);
  expect(inter.check).toBe(true);
  expect(inter.bodyFamily).toMatch(/^"?Inter"?,/);

  await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
  const fonts = await renderedFontsOfText(page, 'Home');
  expect(fonts).toContainEqual(
    expect.objectContaining({
      familyName: expect.stringMatching(/^Inter/),
      isCustomFont: true,
    }),
  );
});

test('Japanese puts a Japanese system font first', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSettings(page);
  // The select's label wrapper intercepts pointer clicks; keyboard opens it.
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'Japanese' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  const family = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(family).toMatch(/^"?(Hiragino Sans|Hiragino Kaku Gothic ProN)"?,/);
  expect(family).toContain('Inter');
});
