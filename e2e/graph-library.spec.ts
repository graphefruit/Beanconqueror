import { expect, test } from './fixtures';
import { startWithBeans } from './support/beans';
import { openAddBrew, showBrewsTab } from './support/brew-form';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';
/** Style the chart inserts the first time it draws. */
const CHART_STYLE = '#bq-uplot-css';

// Starts from stored data instead of adding a brew through the form, because
// the brew form draws its graph and would load the library before the check.
test('the brew form draws its live graph with uPlot once it opens, not at start-up', async ({
  page,
}) => {
  const plotly: string[] = [];
  page.on('request', (_request) => {
    if (_request.url().endsWith(PLOTLY_SCRIPT)) {
      plotly.push(_request.url());
    }
  });
  await startWithBeans(page);

  await expect(page.locator(CHART_STYLE)).toHaveCount(0);

  await showBrewsTab(page);
  await openAddBrew(page);

  // The browser build simulates a scale, so the form shows its graph.
  const graph = page.locator('brew-brewing-graph');
  await expect(graph.locator('.uplot canvas').first()).toBeAttached({
    timeout: 10_000,
  });
  await expect(page.locator(CHART_STYLE)).toHaveCount(1);
  // The chart is a picture with a name; its canvas and axes are hidden.
  await expect(graph.locator('.uplot')).toHaveAttribute('aria-hidden', 'true');
  expect(plotly).toEqual([]);
  expect(await page.evaluate(() => 'Plotly' in window)).toBe(false);
});
