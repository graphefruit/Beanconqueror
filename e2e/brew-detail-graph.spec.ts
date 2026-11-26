import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { brewField, fillBrewField } from './support/brew-form';
import { seedDatabase } from './support/seed';
import { generateDataSet, isOpenBrew } from './support/synthetic-data';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';

/**
 * The graph in the brew details is drawn by uPlot, and maximizing it opens
 * the large graph of the brew. The browser build reads a bundled sample
 * profile for every stored path, so no flow file is needed.
 */

async function openDetailsOfBrewWithGraph(
  page: Page,
  plotly: string[],
): Promise<void> {
  page.on('request', (request) => {
    if (request.url().endsWith(PLOTLY_SCRIPT)) {
      plotly.push(request.url());
    }
  });
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
  await page.evaluate(() => {
    history.pushState({}, '', '/home/brews');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/home\/brews$/);

  const card = page
    .locator('brew-information')
    .filter({ visible: true })
    .filter({ has: page.locator('graph-display-card') });
  await card.getByRole('button', { name: /^Options for the brew/ }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
}

function graphOf(page: Page) {
  return page
    .locator('brew-detail app-brew-graph-view')
    .getByRole('img', { name: /^Flow profile graph\./ });
}

test('the brew details draw the graph, hide a line by its chip and maximize it', async ({
  page,
}) => {
  const plotly: string[] = [];
  await openDetailsOfBrewWithGraph(page, plotly);

  const details = page.locator('brew-detail');
  const graph = graphOf(page);
  await graph.scrollIntoViewIfNeeded();
  await expect(graph.locator('.uplot canvas')).toBeVisible();
  await expect(details.getByText(/^Ø\s[\d.]+ g\/s$/)).toBeVisible();

  const weight = details
    .locator('app-brew-graph-view')
    .getByRole('button', { name: 'Weight', exact: true });
  await expect(weight).toHaveAttribute('aria-pressed', 'true');
  await weight.click();
  await expect(weight).toHaveAttribute('aria-pressed', 'false');
  await expect(graph).not.toHaveAccessibleName(/Weight \(g\)/);

  const maximize = details.getByRole('button', { name: 'Maximize flow graph' });
  await maximize.click();
  const large = page.locator('app-graph-detail');
  await expect(
    large
      .getByRole('img', { name: /^Flow profile graph\./ })
      .locator('.uplot canvas'),
  ).toBeVisible();
  const slider = large.getByRole('slider', { name: 'Time slider' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('PageUp');
  await expect(large.locator('ion-badge')).toHaveText('5.1s');
  await expect(slider).toHaveAttribute('aria-valuetext', /^5\.1 s, /);

  await large.getByRole('button', { name: 'Close' }).click();
  await expect(large).toHaveCount(0);
  // Keyboard and screen reader users go on where they left the details.
  await expect(maximize).toBeFocused();
  await expect(graph.locator('.uplot canvas')).toBeVisible();
  expect(plotly).toEqual([]);
});

test('the brew details still draw the graph after the brew is edited', async ({
  page,
}) => {
  await openDetailsOfBrewWithGraph(page, []);
  const details = page.locator('brew-detail');
  await expect(graphOf(page).locator('.uplot canvas')).toBeAttached();

  await details.getByRole('button', { name: 'Edit brew' }).click();
  const edit = page.locator('brew-edit');
  await expect(brewField(page, 'Ground Coffee (gr)')).toBeVisible();
  await fillBrewField(page, 'Ground Coffee (gr)', '21');
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(edit).toHaveCount(0);

  await expect(details.getByText('21', { exact: true })).toBeVisible();
  const graph = graphOf(page);
  await graph.scrollIntoViewIfNeeded();
  await expect(graph.locator('.uplot canvas')).toBeVisible();
  await expect(
    details.getByRole('button', { name: 'Maximize flow graph' }),
  ).toBeVisible();
});
