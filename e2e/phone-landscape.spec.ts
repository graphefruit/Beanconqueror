import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import {
  measureLayout,
  measureSheet,
  openImportSheet,
  waitForAnimations,
} from './support/layout';

/**
 * A phone in landscape (pixel-7-landscape-chromium project) is wider than 768px like a
 * portrait tablet, but keeps its phone layout: no centred column and full-width sheets.
 */

test('home keeps the phone layout instead of the tablet column', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();
  await waitForAnimations(page);

  const layout = await measureLayout(page);
  expect(layout.overflowing, 'horizontal scrolling').toEqual([]);
  const left = Math.min(...layout.blocks.map((block) => block.left));
  const right = Math.max(...layout.blocks.map((block) => block.right));
  // The tablet column would hold the content to --bq-content-max-width.
  expect(right - left).toBeGreaterThan(layout.maxWidth + 1);
});

test('a sheet spans the whole width', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openImportSheet(page);

  const panel = await measureSheet(page);
  expect(panel.left).toBeLessThan(1);
  expect(panel.width).toBeGreaterThan(panel.viewportWidth - 1);
});
