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
  chooseInBrewSelect,
  fillBrewField,
  openAddBrew,
  openBrewParameterPage,
  saveBrew,
  setParameter,
  WATER,
} from './support/brew-form';
import { startWithFirstBrew } from './support/first-brew';
import { NativeError } from './support/native';
import { readStoredValue } from './support/stored-values';

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

test('grind time and brew time keep their stored value when their fields are shown again', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await startWithFirstBrew(page, BREW_TEST_START, (data) => {
    data.MILL[0].has_timer = true;
    data.SETTINGS[0].manage_parameters.mill_timer = true;
    Object.assign(data.BREWS[0], { mill_timer: 12, brew_time: 30 });
    // A second method hides both fields by its own parameters.
    const kalita = structuredClone(data.PREPARATION[0]);
    kalita.name = 'Kalita Wave';
    kalita.config.uuid = '3d1c3f0e-5a5e-4b8e-9f43-2a1f6f0c7b11';
    kalita.use_custom_parameters = true;
    kalita.manage_parameters = {
      ...data.SETTINGS[0].manage_parameters,
      mill_timer: false,
      brew_time: false,
    };
    data.PREPARATION.push(kalita);
  });

  await brewAction(page, 'Edit');
  await expect(brewField(page, 'Grind Time')).toHaveValue('00:12');
  await expect(brewField(page, 'Time')).toHaveValue('00:30');

  await chooseInBrewSelect(page, 'Preparation method', 'Kalita Wave');
  await expect(brewField(page, 'Grind Time')).toHaveCount(0);
  await expect(brewField(page, 'Time')).toHaveCount(0);
  await chooseInBrewSelect(page, 'Preparation method', 'V60');
  await expect(brewField(page, 'Grind Time')).toHaveValue('00:12');
  await expect(brewField(page, 'Time')).toHaveValue('00:30');
  await saveBrew(page);

  await expect
    .poll(async () => {
      const [brew] =
        (await readStoredValue<{ mill_timer: number; brew_time: number }[]>(
          page,
          'BREWS',
        )) ?? [];
      return [brew?.mill_timer, brew?.brew_time];
    })
    .toEqual([12, 30]);
});
