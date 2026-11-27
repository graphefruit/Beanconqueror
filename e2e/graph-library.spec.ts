import { expect, test } from './fixtures';
import { startWithBeans } from './support/beans';
import { openAddBrew, showBrewsTab } from './support/brew-form';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';
/** The lazy chunk of the chart library, named after its module by the build. */
const UPLOT_CHUNK = /\/uPlot\.esm-[^/]*\.js$/;

// Starts from stored data instead of adding a brew through the form, because
// the brew form draws its graph and would load the library before the check.
test('the brew form loads the chart library and draws its live graph, nothing at start-up', async ({
  page,
}) => {
  const plotly: string[] = [];
  const uplot: string[] = [];
  page.on('request', (_request) => {
    const url = _request.url();
    if (url.endsWith(PLOTLY_SCRIPT)) {
      plotly.push(url);
    } else if (UPLOT_CHUNK.test(url)) {
      uplot.push(url);
    }
  });
  await startWithBeans(page);

  expect(uplot).toEqual([]);

  await showBrewsTab(page);
  await openAddBrew(page);

  // The browser build simulates a scale, so the form shows its graph.
  const graph = page.locator('brew-brewing-graph');
  await expect(graph.locator('.uplot canvas').first()).toBeAttached({
    timeout: 10_000,
  });
  expect(uplot.length).toBe(1);
  // The container names the graph; canvas and axes are hidden from screen readers.
  await expect(graph.locator('.uplot')).toHaveAttribute('aria-hidden', 'true');
  expect(plotly).toEqual([]);
  expect(await page.evaluate(() => 'Plotly' in window)).toBe(false);
});
