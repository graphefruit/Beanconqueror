import { expect, test } from './fixtures';
import { startWithBeans } from './support/beans';
import { openAddBrew, showBrewsTab } from './support/brew-form';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';

// Starts from stored data instead of adding a brew through the form, because
// the brew form draws its graph and would load the library before the check.
test('the graph library is loaded once a graph is shown, not at start-up', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (_request) => {
    if (_request.url().endsWith(PLOTLY_SCRIPT)) {
      requested.push(_request.url());
    }
  });
  await startWithBeans(page);

  expect(requested).toEqual([]);
  expect(await page.evaluate(() => 'Plotly' in window)).toBe(false);

  await showBrewsTab(page);
  await openAddBrew(page);

  await expect(page.locator('.js-plotly-plot').first()).toBeAttached({
    timeout: 10_000,
  });
  expect(requested.length).toBe(1);
});
