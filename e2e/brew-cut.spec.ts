import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { seedDatabase } from './support/seed';
import { generateDataSet, isOpenBrew } from './support/synthetic-data';

/**
 * Cutting a flow profile from the brew details. The browser build reads the
 * bundled BeanconquerorFlowTestDataSecond.json for every stored path: 189.4 s,
 * 700.6 g at its end and 700.7 g at 185.9 s.
 */

const RANGE = 'Cut from left and right (Start and End)';

async function openCut(page: Page): Promise<Locator> {
  const data = generateDataSet({ brews: 3, beans: 2, archivedBeanShare: 0 });
  const withGraph = data.BREWS.find((brew) => isOpenBrew(data, brew));
  expect(withGraph).toBeDefined();
  data.BREWS.forEach((brew) => {
    brew.flow_profile =
      brew === withGraph ? `brews/${brew.config.uuid}_flow_profile.json` : '';
  });
  await seedDatabase(page, data);
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();

  const card = page
    .locator('brew-information')
    .filter({ visible: true })
    .filter({ has: page.locator('graph-display-card') });
  await card.getByRole('button', { name: /^Options for the brew of / }).click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByRole('button', { name: 'Cut flow profile' }).click();

  const dialog = page.locator('app-brew-popover-cut');
  await expect(
    dialog.getByRole('img', { name: /^Cut Flow Profile\./ }),
  ).toBeVisible();
  return dialog;
}

function shown(dialog: Locator, label: string): Locator {
  return dialog.locator('ion-label').filter({ hasText: label }).locator('p');
}

test('both knobs move by keyboard and the new duration and weight follow', async ({
  page,
}) => {
  const dialog = await openCut(page);
  const graph = dialog.locator('.chart .uplot canvas');
  await expect(graph).toBeVisible();
  await expect(shown(dialog, 'New Duration')).toHaveText('189.4s');
  await expect(shown(dialog, 'New Weight Preview')).toHaveText('700.6 g');

  const start = dialog.getByRole('slider', { name: `${RANGE}, from` });
  const end = dialog.getByRole('slider', { name: `${RANGE}, to` });
  // 0.1 s per arrow key, 1 s per page key.
  await start.focus();
  for (const key of ['ArrowRight', 'ArrowRight', 'PageUp', 'PageUp']) {
    await page.keyboard.press(key);
  }
  await end.focus();
  for (const key of ['PageDown', 'PageDown', 'PageDown', 'ArrowLeft']) {
    await page.keyboard.press(key);
  }

  await expect(start).toHaveAttribute('aria-valuenow', '2.2');
  await expect(end).toHaveAttribute('aria-valuenow', '186.3');
  await expect(shown(dialog, 'New Duration')).toHaveText('184.1s');
  await expect(shown(dialog, 'New Weight Preview')).toHaveText('700.7 g');
  await expect(end).toHaveAttribute(
    'aria-valuetext',
    '186.3 s, new duration 184.1 s, new weight 700.7 g',
  );
  // The graph stays the same canvas; only the markers move.
  await expect(graph).toHaveCount(1);
  await expect(dialog.locator('#cutChart')).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});
