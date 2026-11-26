import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { generateDataSet, isOpenBrew } from './support/synthetic-data';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';

/**
 * The large graph of a brew or of a stored graph is drawn by uPlot. The
 * browser build reads a bundled sample profile for every stored path, and a
 * bundled reference for a brew, so no flow file is needed.
 */

async function start(page: Page, plotly: string[]): Promise<void> {
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
  const graphs = [
    {
      name: 'Turbo',
      note: '',
      flow_profile: 'graphs/turbo_flow_profile.json',
      finished: false,
      config: { uuid: 'graph-0', unix_timestamp: 1_761_000_000 },
    },
  ];
  await seedDatabase(page, { ...data, GRAPH: graphs });
  await page.goto('/');
  await expect(page).toHaveURL(/\/home\/dashboard$/);
}

/** Shows a screen the way the router does, without a reload. */
async function show(page: Page, route: string): Promise<void> {
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await expect(page).toHaveURL(new RegExp(`${route}$`));
}

test('the graph of a brew: a chip hides a line, the slider moves by keyboard and says the values', async ({
  page,
}) => {
  const plotly: string[] = [];
  await start(page, plotly);
  await show(page, '/home/brews');

  const card = page
    .locator('brew-information')
    .filter({ visible: true })
    .filter({ has: page.locator('graph-display-card') });
  await card.getByRole('button', { name: /^Options for the brew/ }).click();
  await page.getByRole('button', { name: 'Show graph' }).click();

  const detail = page.locator('app-graph-detail');
  const graph = detail.getByRole('img', { name: /^Flow profile graph\./ });
  await expect(graph.locator('.uplot canvas')).toBeVisible();

  const weight = detail.getByRole('button', { name: 'Weight', exact: true });
  await expect(weight).toHaveAttribute('aria-pressed', 'true');
  await weight.click();
  await expect(weight).toHaveAttribute('aria-pressed', 'false');
  await expect(graph).not.toHaveAccessibleName(/Weight \(g\)/);

  const slider = detail.getByRole('slider', { name: 'Time slider' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('PageUp');
  await expect(detail.locator('ion-badge')).toHaveText('5.2s');
  await expect(slider).toHaveAttribute(
    'aria-valuetext',
    /^5\.2 s, Flow \(smoothed\): [\d.]+ g\/s/,
  );
  await expect(slider).not.toHaveAttribute('aria-valuetext', /Weight:/);

  await detail.getByRole('button', { name: 'Close' }).click();
  await expect(detail).toHaveCount(0);
  expect(plotly).toEqual([]);
});

test('the graph library opens a stored graph large', async ({ page }) => {
  const plotly: string[] = [];
  await start(page, plotly);
  await show(page, '/home/profile/graph');

  await page
    .locator('graph-information-card')
    .filter({ visible: true })
    .click();

  const detail = page.locator('app-graph-detail');
  await expect(
    detail
      .getByRole('img', { name: /^Flow profile graph\./ })
      .locator('.uplot canvas'),
  ).toBeVisible();
  await expect(
    detail.getByRole('slider', { name: 'Time slider' }),
  ).toBeVisible();

  await detail.getByRole('button', { name: 'Close' }).click();
  await expect(detail).toHaveCount(0);
  expect(plotly).toEqual([]);
});
