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
import {
  BREW_FORM_REFRACTOMETER_ERROR,
  completeFirstRunWithBrew,
} from './support/first-brew';
import { NativeError } from './support/native';

/**
 * Characterization of how the brew form reads and shows values today: number
 * parsing, units, brew ratio, TDS and extraction yield, photos and the
 * tasting (cupping) notes. Each test starts with one bean, a V60, one grinder
 * and one brew of 18 g / 300 g.
 */

test.use({ allowedConsoleErrors: [BREW_FORM_REFRACTOMETER_ERROR] });
// Setup plus several page changes per test; under parallel load this can
// exceed the default 30 s.
test.describe.configure({ timeout: 60_000 });

async function start(page: Page): Promise<void> {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
}

test('number fields accept a decimal comma and clean up other input when left', async ({
  page,
}) => {
  await start(page);
  await openAddBrew(page);
  const dose = brewField(page, 'Ground Coffee (gr)');

  // The field is cleared on focus while it holds 0 …
  await expect(dose).toHaveValue('0');
  await dose.focus();
  await expect(dose).toHaveValue('');
  // … and an empty field becomes 0 again.
  await dose.blur();
  await expect(dose).toHaveValue('0');

  await fillBrewField(page, 'Ground Coffee (gr)', '15,5');
  await expect(dose).toHaveValue('15.5');
  await fillBrewField(page, 'Ground Coffee (gr)', '16.25');
  await expect(dose).toHaveValue('16.25');
  // Trailing text is cut off, text alone empties the field.
  await fillBrewField(page, 'Ground Coffee (gr)', '17g');
  await expect(dose).toHaveValue('17');
  await fillBrewField(page, 'Ground Coffee (gr)', 'abc');
  await expect(dose).toHaveValue('');
  // A leading comma is not converted (indexOf returns 0), so ",5" is dropped.
  await fillBrewField(page, 'Ground Coffee (gr)', ',5');
  await expect(dose).toHaveValue('');
  await fillBrewField(page, 'Ground Coffee (gr)', '0,5');
  await expect(dose).toHaveValue('0.5');

  // Grind setting is free text by default.
  await fillBrewField(page, 'Grind Setting', '2,5 clicks');
  await expect(brewField(page, 'Grind Setting')).toHaveValue('2,5 clicks');
});

test('the brew ratio follows dose and water live and ignores the water unit', async ({
  page,
}) => {
  await start(page);
  await openAddBrew(page);
  const water = brewField(page, WATER);
  await expect(water).toHaveAccessibleName('Amount of water (1 / ? , ? g/l)');

  await fillBrewField(page, 'Ground Coffee (gr)', '15');
  await fillBrewField(page, WATER, '250');
  await expect(water).toHaveAccessibleName(
    'Amount of water (1 / 16.67 , 60 g/l)',
  );
  await fillBrewField(page, 'Ground Coffee (gr)', '16,5');
  await expect(water).toHaveAccessibleName(
    'Amount of water (1 / 15.15 , 66 g/l)',
  );

  // Switching the water unit to ml keeps the ratio as it is.
  await page.getByRole('button', { name: 'gr', exact: true }).first().focus();
  await page.keyboard.press('Enter');
  await page.getByRole('radio', { name: 'ml', exact: true }).click();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'ml', exact: true }),
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
    page.getByRole('heading', { name: 'Extraction Yield %:' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: '20.25' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1.35' })).toBeVisible();
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
  await expect(page.getByText(/User denied access to camera/)).toBeVisible();
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
  await page.getByRole('checkbox', { name: 'Lime', exact: true }).click();
  // The picker opens above the tasting dialog, and both stay in the
  // accessibility tree; the picker's Save is the later one.
  const save = page.getByRole('button', { name: 'Save' });
  await save.last().click();
  await expect(save).toHaveCount(1);
  await expect(page.getByText('Lime', { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await brewAction(page, 'Details');
  await expect(page.getByText('Lime', { exact: true })).toBeVisible();
});
