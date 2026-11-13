import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  addPreparationMethod,
  backToBrews,
  BEVERAGE,
  BREW_TEST_START,
  brewAction,
  brewField,
  chooseInBrewSelect,
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

/**
 * Characterization of the brew parameter customizing as it works today:
 * which fields the brew form shows (globally and per preparation method),
 * their order, and which values are pre-filled from the last brew or copied
 * when a brew is repeated. Each test starts with one bean, a V60, one grinder
 * and one brew of 18 g / 300 g.
 */

test.use({ allowedConsoleErrors: [BREW_FORM_REFRACTOMETER_ERROR] });
// Setup plus several page changes per test; under parallel load this can
// exceed the default 30 s.
test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
});

async function top(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box, 'element has a layout box').not.toBeNull();
  return box!.y;
}

/** Expects the elements to be laid out from top to bottom in this order. */
async function expectVisualOrder(elements: Locator[]): Promise<void> {
  const tops: number[] = [];
  for (const element of elements) {
    tops.push(await top(element));
  }
  expect(tops, 'vertical positions').toEqual([...tops].sort((a, b) => a - b));
}

const beanSelect = (page: Page) =>
  page.getByRole('button', { name: /^Bean Type, / });
const grinderSelect = (page: Page) =>
  page.getByRole('button', { name: /^Grinder, / });
const methodSelect = (page: Page) =>
  page.getByRole('button', { name: /^Preparation method, / });

/** Fields that are switched off in a fresh install. */
const HIDDEN_BY_DEFAULT = [
  'Bean weight (g)',
  'Grind Time',
  'Grind Speed (rpm)',
  'Profile',
  'Vessel name',
  'Temperature Time',
  'First drip time',
  'Coffee Type',
  'Coffee Concentration',
  'Total dissolved solids %',
];

test('a filter method shows the default fields, sorted by the default order', async ({
  page,
}) => {
  await openAddBrew(page);

  for (const name of [
    'Grind Setting',
    'Ground Coffee (gr)',
    'Brew Temperature',
    'Time',
    'Bloom Time / Pre-infusion',
    'Notes',
    'Creation Date',
  ]) {
    await expect(brewField(page, name), name).toBeVisible();
  }
  await expect(brewField(page, WATER)).toBeVisible();
  await expect(brewField(page, BEVERAGE)).toBeVisible();
  await expect(page.getByRole('slider', { name: /Rating/ })).toBeVisible();
  for (const name of HIDDEN_BY_DEFAULT) {
    await expect(brewField(page, name), name).toHaveCount(0);
  }
  await expect(page.getByRole('button', { name: /^Water, / })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /^Preparation tools/ }),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Photo' })).toHaveCount(0);

  // The order is applied with CSS only: on screen the bean comes first, while
  // the markup (and so a screen reader) starts with "Grind Setting".
  await expectVisualOrder([
    beanSelect(page),
    brewField(page, 'Ground Coffee (gr)'),
    grinderSelect(page),
    brewField(page, 'Grind Setting'),
    methodSelect(page),
    brewField(page, 'Brew Temperature'),
  ]);
  await expectVisualOrder([
    brewField(page, WATER),
    brewField(page, BEVERAGE),
    page.getByRole('slider', { name: /Rating/ }),
    brewField(page, 'Notes'),
    brewField(page, 'Creation Date'),
  ]);
});

test('an espresso method replaces the amount of water by first drip and coffee brew time', async ({
  page,
}) => {
  await addPreparationMethod(page, 'Espresso Machine');
  await openAddBrew(page);
  await expect(methodSelect(page)).toHaveAccessibleName(
    'Preparation method, Espresso Machine',
  );

  await expect(brewField(page, WATER)).toHaveCount(0);
  await expect(brewField(page, 'First drip time')).toBeVisible();
  await expect(page.getByText(/Coffee Brew Time:/)).toBeVisible();
  // The brew ratio moves to the beverage quantity.
  await fillBrewField(page, 'Ground Coffee (gr)', '18');
  await fillBrewField(page, BEVERAGE, '36');
  await expect(brewField(page, BEVERAGE)).toHaveAccessibleName(
    'Beverage quantity (1 / 2.00 , 500 g/l)',
  );

  // Switching the method in the open form switches the field set.
  await chooseInBrewSelect(page, 'Preparation method', 'V60');
  await expect(brewField(page, WATER)).toBeVisible();
  await expect(brewField(page, 'First drip time')).toHaveCount(0);
});

test('managed parameters hide and show fields in the brew form', async ({
  page,
}) => {
  await openBrewParameterPage(page, 'Manage parameters');
  // Bean, grinder and method cannot be switched off.
  for (const name of ['Bean Type', 'Grinder', 'Preparation method']) {
    await expect(
      page.getByRole('checkbox', { name, exact: true }),
    ).toBeDisabled();
  }
  await setParameter(page, 'Grind Setting', false);
  await setParameter(page, 'Brew Temperature', false);
  await setParameter(page, 'Bloom Time / Pre-infusion', false);
  await setParameter(page, 'Coffee Type', true);
  await setParameter(page, 'Total dissolved solids %', true);
  await setParameter(page, 'Grind Time', true);
  await setParameter(page, 'Attachments / Photos', true);
  await backToBrews(page);

  await openAddBrew(page);
  await expect(brewField(page, 'Grind Setting')).toHaveCount(0);
  await expect(brewField(page, 'Brew Temperature')).toHaveCount(0);
  await expect(brewField(page, 'Bloom Time / Pre-infusion')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Set bloom time' }),
  ).toHaveCount(0);
  await expect(brewField(page, 'Coffee Type')).toBeVisible();
  await expect(brewField(page, 'Total dissolved solids %')).toBeVisible();
  // Grind time additionally needs a grinder that has a timer; this one has none.
  await expect(brewField(page, 'Grind Time')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add Photo' })).toBeVisible();
  // Extraction yield needs ground coffee, beverage quantity and TDS.
  await expect(page.getByText(/Extraction Yield %:/)).toBeVisible();

  // Hidden fields are hidden in the details too.
  await page.getByRole('button', { name: 'Cancel' }).click();
  await brewAction(page, 'Details');
  // Unlike its neighbours, this label has no colon.
  await expect(
    page.getByRole('heading', { name: 'Coffee Type', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Total dissolved solids %:' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Grind Setting:' }),
  ).toHaveCount(0);
});

test('the first drip time of the global parameters only appears for espresso methods', async ({
  page,
}) => {
  // It is switched on by default, but a V60 form does not show it.
  await openBrewParameterPage(page, 'Manage parameters');
  await expect(
    page.getByRole('checkbox', { name: /^First drip time/ }),
  ).toBeChecked();
  await backToBrews(page);
  await openAddBrew(page);
  await expect(brewField(page, 'First drip time')).toHaveCount(0);
});

test('sorted parameters change the order of the brew form', async ({
  page,
}) => {
  await openBrewParameterPage(page, 'Sort parameters');
  // The rows only have text; the drag handle has no accessible name, so it is
  // found by its element (known gap until the sort list gets labelled handles).
  const row = (label: string) =>
    page.locator('ion-item').filter({
      has: page.getByText(label, { exact: true }),
    });
  const handle = row('Brew Temperature').locator('ion-reorder');
  const target = row('Bean Type');
  await expect(
    page.getByRole('main').filter({ hasText: 'Before brewing' }),
  ).toContainText(/Before brewing\s*Bean Type\s*Bean weight/);

  // hover() waits until the page transition has settled.
  await target.hover();
  await handle.hover();
  const from = (await handle.boundingBox())!;
  const to = (await target.boundingBox())!;
  const x = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  // Drop above the first row, which the group clamps to the first position.
  const endY = to.y - 20;
  await page.mouse.move(x, startY);
  await page.mouse.down();
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x, startY + ((endY - startY) * i) / steps);
  }
  // Ionic applies moves once per frame; release only after the row has
  // visibly passed the first one, or the drop lands one row too low.
  await expect(async () => {
    expect(await top(row('Brew Temperature'))).toBeLessThan(await top(target));
  }).toPass();
  await page.mouse.up();
  // The dropped row is moved in the markup once the drop has completed.
  await expect(
    page.getByRole('main').filter({ hasText: 'Before brewing' }),
  ).toContainText(/Before brewing\s*Brew Temperature\s*Bean Type/);
  await backToBrews(page);

  await openAddBrew(page);
  await expectVisualOrder([
    brewField(page, 'Brew Temperature'),
    beanSelect(page),
    brewField(page, 'Ground Coffee (gr)'),
  ]);
});

test('custom parameters of a method replace the global ones for that method only', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Methods' }).click();
  await page.getByRole('button', { name: 'Preparation options' }).click();
  await page.getByRole('button', { name: 'Customize parameters' }).click();
  // Ionic projects modal content into the dialog through a slot, so locators
  // cannot be chained below the dialog; the page behind it is hidden anyway.
  await setParameter(page, 'Use custom parameters', true);
  // A filter method starts with the global set, but first drip time off.
  await expect(
    page.getByRole('checkbox', { name: /^First drip time/ }),
  ).not.toBeChecked();
  await setParameter(page, 'Brew Temperature', false);
  await setParameter(page, 'First drip time', true);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await addPreparationMethod(page, 'Espresso Machine');

  await openAddBrew(page);
  // Espresso Machine sorts first; it keeps the global set.
  await expect(methodSelect(page)).toHaveAccessibleName(
    'Preparation method, Espresso Machine',
  );
  await expect(brewField(page, 'Brew Temperature')).toBeVisible();

  await chooseInBrewSelect(page, 'Preparation method', 'V60');
  await expect(brewField(page, 'Brew Temperature')).toHaveCount(0);
  // With custom parameters, first drip time also shows for a filter method.
  await expect(brewField(page, 'First drip time')).toBeVisible();
  await expect(page.getByText(/Coffee Brew Time:/)).toBeVisible();
});

test('without preset values a new brew starts empty', async ({ page }) => {
  await openAddBrew(page);
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('0');
  await expect(brewField(page, WATER)).toHaveValue('0');
  await expect(brewField(page, 'Grind Setting')).toHaveValue('');
  // The timer shows nothing at first and 00:00 shortly after.
  await expect(brewField(page, 'Time')).toHaveValue(/^(00:00)?$/);
});

test('preset values copy the chosen fields of the last brew into a new brew', async ({
  page,
}) => {
  // Add a second method that sorts first, to see the last brew's method win.
  await addPreparationMethod(page, 'Espresso Machine');
  await openBrewParameterPage(page, 'Define default parameters');
  const preset = page.getByRole('checkbox', { name: 'Preset Values?' });
  await expect(preset).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Grind Setting' }),
  ).toBeHidden();
  await setParameter(page, 'Preset Values?', true);
  // Defaults: notes and rating are not carried over.
  await expect(page.getByRole('checkbox', { name: 'Notes' })).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Rating' }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: /^Ground Coffee/ }),
  ).toBeChecked();
  await backToBrews(page);

  // Last brew: V60, 18 g / 300 g. Give it notes, a rating and a grind setting.
  await brewAction(page, 'Edit');
  await fillBrewField(page, 'Grind Setting', '22');
  await fillBrewField(page, 'Notes', 'Too bitter');
  await fillBrewField(page, 'Brew Temperature', '92,5');
  await page.getByRole('slider', { name: /Rating/ }).focus();
  await page.keyboard.press('ArrowRight');
  await saveBrew(page);

  await openAddBrew(page);
  await expect(methodSelect(page)).toHaveAccessibleName(
    'Preparation method, V60',
  );
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('18');
  await expect(brewField(page, WATER)).toHaveValue('300');
  await expect(brewField(page, 'Grind Setting')).toHaveValue('22');
  await expect(brewField(page, 'Brew Temperature')).toHaveValue('92.5');
  await expect(brewField(page, 'Notes')).toHaveValue('');
  await expect(page.getByRole('slider', { name: /Rating/ })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await page.getByRole('button', { name: 'Cancel' }).click();

  // Switching a field off stops copying it.
  await openBrewParameterPage(page, 'Define default parameters');
  await setParameter(page, 'Ground Coffee', false);
  await backToBrews(page);
  await openAddBrew(page);
  await expect(brewField(page, WATER)).toHaveValue('300');
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('0');
});

test('repeat parameters decide what a repeated brew copies', async ({
  page,
}) => {
  await openBrewParameterPage(page, 'Define repeat parameters');
  // Everything is copied by default; the method cannot be switched off.
  await expect(page.getByRole('checkbox', { name: 'Notes' })).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: /^Preparation method/ }),
  ).toBeDisabled();
  await setParameter(page, 'Ground Coffee', false);
  await backToBrews(page);

  await brewAction(page, 'Repeat');
  await expect(brewField(page, WATER)).toHaveValue('300');
  await expect(brewField(page, 'Ground Coffee (gr)')).toHaveValue('0');
  await saveBrew(page);
});
