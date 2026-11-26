import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { generateDataSet, isOpenBrew } from './support/synthetic-data';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';

/**
 * The small graph of a stored brew or graph is drawn by uPlot, inside a
 * picture named for screen readers. The browser build reads a bundled sample
 * profile for every stored path, so no flow file is needed.
 */

async function start(page: Page, plotly: string[]): Promise<void> {
  page.on('request', (request) => {
    if (request.url().endsWith(PLOTLY_SCRIPT)) {
      plotly.push(request.url());
    }
  });
  const data = generateDataSet({ brews: 3, beans: 2, archivedBeanShare: 0 });
  // One brew under "Current" has a flow profile.
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

function picture(scope: Locator): Locator {
  return scope.getByRole('img', { name: 'Flow profile graph' });
}

test('a brew card draws its graph once its graph slide is shown', async ({
  page,
}) => {
  const plotly: string[] = [];
  await start(page, plotly);
  await show(page, '/home/brews');

  const card = page
    .locator('brew-information')
    .filter({ visible: true })
    .filter({ has: page.locator('graph-display-card') });
  await expect(card).toHaveCount(1);
  const graph = picture(card);
  await expect(graph).toBeAttached();
  // The graph waits on the second slide until it is looked at.
  await expect(graph.locator('.uplot')).toHaveCount(0);

  await card.locator('.swiper-pagination-bullet').nth(1).click();

  await expect(graph).toBeInViewport();
  await expect(graph.locator('.uplot canvas')).toBeVisible();
  expect(plotly).toEqual([]);
});

test('the graph library draws a stored graph', async ({ page }) => {
  const plotly: string[] = [];
  await start(page, plotly);
  await show(page, '/home/profile/graph');

  const card = page.locator('graph-information-card').filter({ visible: true });
  await expect(picture(card).locator('.uplot canvas')).toBeVisible();
  expect(plotly).toEqual([]);
});
