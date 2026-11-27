import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { openAddBrew, showBrewsTab } from './support/brew-form';
import type { Rgb } from './support/colour';
import { seedDatabase } from './support/seed';
import { generateDataSet, isOpenBrew } from './support/synthetic-data';

/** Default line colours of the weight in the light theme. */
const WEIGHT: Rgb = [0xcd, 0xc2, 0xac];
const WEIGHT_REFERENCE: Rgb = [0xeb, 0xe6, 0xdd];

/**
 * The live graph of the brew form shows a stored shot when a brew is edited
 * and a chosen reference under the live lines. The browser build simulates a
 * scale and reads a bundled sample profile for every stored path.
 */

async function startWithBrewWithGraph(page: Page): Promise<void> {
  const data = generateDataSet({ brews: 3, beans: 2, archivedBeanShare: 0 });
  const withGraph = data.BREWS.find((brew) => isOpenBrew(data, brew));
  expect(withGraph).toBeDefined();
  data.BREWS.forEach((brew) => {
    brew.flow_profile =
      brew === withGraph ? `brews/${brew.config.uuid}_flow_profile.json` : '';
  });
  await seedDatabase(page, data);
  await page.goto('/');
  await expect(page).toHaveURL(/\/home\/dashboard$/);
  await showBrewsTab(page);
}

function liveGraph(page: Page): Locator {
  return page.locator('brew-brewing-graph .uplot canvas').first();
}

/** Pixels of the canvas drawn in about the given colour. */
function pixelsIn(canvas: Locator, colour: Rgb): Promise<number> {
  return canvas.evaluate((element, [r, g, b]) => {
    const canvasEl = element as HTMLCanvasElement;
    const context = canvasEl.getContext('2d');
    if (!context) {
      return 0;
    }
    const { data } = context.getImageData(
      0,
      0,
      canvasEl.width,
      canvasEl.height,
    );
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (
        data[i + 3] > 200 &&
        Math.abs(data[i] - r) < 12 &&
        Math.abs(data[i + 1] - g) < 12 &&
        Math.abs(data[i + 2] - b) < 12
      ) {
        count++;
      }
    }
    return count;
  }, colour);
}

test('editing a brew draws its stored shot in the brew form', async ({
  page,
}) => {
  await startWithBrewWithGraph(page);

  const card = page
    .locator('brew-information')
    .filter({ visible: true })
    .filter({ has: page.locator('graph-display-card') });
  await card.getByRole('button', { name: /^Options for the brew/ }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();

  const canvas = liveGraph(page);
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(() => pixelsIn(canvas, WEIGHT), { timeout: 10_000 })
    .toBeGreaterThan(50);
});

test('a chosen reference is drawn under the live graph', async ({ page }) => {
  await startWithBrewWithGraph(page);
  await openAddBrew(page);

  const canvas = liveGraph(page);
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  const before = await pixelsIn(canvas, WEIGHT_REFERENCE);

  await page
    .getByRole('button', { name: 'Choose reference graph', exact: true })
    .click();
  const chooser = page.locator('app-brew-choose-graph-reference');
  await expect(
    chooser.getByRole('heading', { level: 1, name: 'Select reference graph' }),
  ).toBeVisible();
  await chooser.getByRole('radio').first().click();
  await chooser.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(chooser).toBeHidden();

  await expect
    .poll(() => pixelsIn(canvas, WEIGHT_REFERENCE), { timeout: 10_000 })
    .toBeGreaterThan(before + 30);
});
