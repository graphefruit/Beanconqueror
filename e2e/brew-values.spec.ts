import type { CameraPlugin } from '@capacitor/camera';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  backToBrews,
  BEVERAGE,
  BREW_TEST_START,
  brewAction,
  brewField,
  brewList,
  fillBrewField,
  openAddBrew,
  openBrewParameterPage,
  saveBrew,
  setParameter,
  WATER,
} from './support/brew-form';
import { startWithFirstBrew } from './support/first-brew';
import { NativeError } from './support/native';

/**
 * Characterization of how the brew form reads and shows values today: number
 * parsing, units, brew ratio, TDS and extraction yield, photos and the
 * tasting (cupping) notes. Each test starts with one bean, a V60, one grinder
 * and one brew of 18 g / 300 g.
 */

// Setup plus several page changes per test; under parallel load this can
// exceed the default 30 s.
test.describe.configure({ timeout: 60_000 });

async function start(page: Page): Promise<void> {
  await page.clock.install({ time: BREW_TEST_START });
  await startWithFirstBrew(page, BREW_TEST_START);
}

test('the brew ratio follows dose and water live and ignores the water unit', async ({
  page,
}) => {
  await start(page);
  await openAddBrew(page);
  const water = brewField(page, WATER);
  await expect(water).toHaveAccessibleName('Amount of water (1 / ? , ? g/l)');

  // The number fields clean up their input; the rules are component tests
  // of the directives, this checks they are on the dose field.
  const dose = brewField(page, 'Ground Coffee (gr)');
  await expect(dose).toHaveValue('0');
  await dose.focus();
  await expect(dose).toHaveValue('');
  await dose.blur();
  await expect(dose).toHaveValue('0');
  // Grind setting is free text by default.
  await fillBrewField(page, 'Grind Setting', '2,5 clicks');
  await expect(brewField(page, 'Grind Setting')).toHaveValue('2,5 clicks');

  await fillBrewField(page, 'Ground Coffee (gr)', '15');
  await fillBrewField(page, WATER, '250');
  await expect(water).toHaveAccessibleName(
    'Amount of water (1 / 16.67 , 60 g/l)',
  );
  // A decimal comma is read as a point.
  await fillBrewField(page, 'Ground Coffee (gr)', '16,5');
  await expect(dose).toHaveValue('16.5');
  await expect(water).toHaveAccessibleName(
    'Amount of water (1 / 15.15 , 66 g/l)',
  );

  // Switching the water unit to ml keeps the ratio as it is.
  await page
    .getByRole('button', { name: 'Unit of Amount of water, gr', exact: true })
    .focus();
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: 'ml', exact: true }).click();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(
    page.getByRole('button', {
      name: 'Unit of Amount of water, ml',
      exact: true,
    }),
  ).toBeVisible();
  await expect(water).toHaveAccessibleName(
    'Amount of water (1 / 15.15 , 66 g/l)',
  );
  await saveBrew(page);

  await expect(brewList(page)).toContainText(
    /16\.5gr \/ 250ml\s*\(1 \/ 15\.15\)/,
  );
});

test('TDS gives the extraction yield from dose and beverage quantity', async ({
  page,
}) => {
  await start(page);
  await openBrewParameterPage(page, 'Manage parameters');
  await setParameter(page, 'Total dissolved solids %', true);
  await backToBrews(page);

  await openAddBrew(page);
  const yieldLabel = page.getByText(/Extraction Yield %:/);
  await expect(yieldLabel).toHaveText(/Extraction Yield %:\s*0\s*$/);
  await expect(
    page.getByRole('button', { name: 'Show extraction chart' }),
  ).toHaveCount(0);

  await fillBrewField(page, 'Ground Coffee (gr)', '20');
  await fillBrewField(page, WATER, '320');
  await fillBrewField(page, BEVERAGE, '300');
  await fillBrewField(page, 'Total dissolved solids %', '1,35');
  await expect(brewField(page, 'Total dissolved solids %')).toHaveValue('1.35');
  // V60 (not full immersion): beverage quantity × TDS / dose = 300 × 1.35 / 20.
  await expect(yieldLabel).toHaveText(/Extraction Yield %:\s*20\.25\s*$/);
  await expect(
    page.getByRole('button', { name: 'Show extraction chart' }),
  ).toBeVisible();
  await saveBrew(page);

  await brewAction(page, 'Details');
  await expect(
    page.getByText('Extraction Yield %:', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('20.25', { exact: true })).toBeVisible();
  await expect(page.getByText('1.35', { exact: true })).toBeVisible();
});

test('a user is told when the camera refuses to take a brew photo', async ({
  page,
  native,
}) => {
  await native.mockCapacitor<CameraPlugin>('Camera', {
    getPhoto: () => {
      throw new NativeError('User denied access to camera');
    },
  });
  await start(page);
  await openBrewParameterPage(page, 'Manage parameters');
  await setParameter(page, 'Attachments / Photos', true);
  await backToBrews(page);

  await openAddBrew(page);
  await page.getByRole('button', { name: 'Add Photo' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();

  await expect(page.getByText('An error occurred')).toBeVisible();
  await expect(
    page.getByText(
      'Beanconqueror is not allowed to use the camera or your photos. You can allow access in the settings of your device.',
    ),
  ).toBeVisible();
  // The technical cause is for the log only.
  await expect(page.getByText(/User denied access to camera/)).toHaveCount(0);
  expect(await native.calls()).toContainEqual({
    plugin: 'Camera',
    method: 'getPhoto',
    mocked: true,
  });
});

test('tasting notes picked in the cupping are shown in the brew details', async ({
  page,
}) => {
  await start(page);
  await brewAction(page, 'Cupping');
  await expect(page.getByRole('tab', { name: 'Aroma' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('tab', { name: 'Systematic cupping' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add aromas/flavors' }).click();
  const lime = page.getByRole('checkbox', { name: 'Lime', exact: true });
  await lime.click();
  // The tasting dialog leaves the accessibility tree while the picker is
  // open above it, so this Save is the picker's.
  const save = page.getByRole('button', { name: 'Save' });
  await save.click();
  await expect(lime).toHaveCount(0);
  await expect(page.getByText('Lime', { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await brewAction(page, 'Details');
  await expect(page.getByText('Lime', { exact: true })).toBeVisible();
});
