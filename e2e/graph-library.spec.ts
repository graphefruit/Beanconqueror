import { expect, test } from './fixtures';
import { openAddBrew } from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';

const PLOTLY_SCRIPT = '/assets/js/plotly.min.js';

test('the graph library is loaded once a graph is shown, not at start-up', async ({
  page,
}) => {
  const requested: string[] = [];
  page.on('request', (_request) => {
    if (_request.url().endsWith(PLOTLY_SCRIPT)) {
      requested.push(_request.url());
    }
  });
  await page.goto('/');
  await completeFirstRunWithBrew(page);

  expect(requested).toEqual([]);
  expect(await page.evaluate(() => 'Plotly' in window)).toBe(false);

  await openAddBrew(page);

  await expect(page.locator('.js-plotly-plot').first()).toBeAttached({
    timeout: 10_000,
  });
  expect(requested.length).toBe(1);
});
