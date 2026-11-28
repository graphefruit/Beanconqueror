import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  BREW_TEST_START,
  brewAction,
  brewField,
  chooseInBrewSelect,
  fillBrewField,
  saveBrew,
  WATER,
} from './support/brew-form';
import { startWithFirstBrew, type FirstBrewData } from './support/first-brew';
import { readStoredValue } from './support/stored-values';

/**
 * Rare combinations of brew parameters that broke saving or the scale before: a section of the
 * brew form without any shown parameter, globally or by the custom parameters of a method, and a
 * method that hides a section being the one the form opens with. Each test starts with one bean,
 * a V60, one grinder and one brew. Page errors fail a test by the fixture.
 */

// Setup plus several page changes per test; under parallel load this can
// exceed the default 30 s.
test.describe.configure({ timeout: 60_000 });

type Parameters = FirstBrewData['SETTINGS'][number]['manage_parameters'];
type ParameterName = keyof Parameters;

/** Every parameter that makes the section "While brewing" show (UIBrewHelper). */
const WHILE_PARAMETERS: readonly ParameterName[] = [
  'pressure_profile',
  'brew_temperature_time',
  'brew_time',
  'coffee_blooming_time',
  'coffee_first_drip_time',
];
/** Every parameter that makes the section "After brewing" show. */
const AFTER_PARAMETERS: readonly ParameterName[] = [
  'brew_quantity',
  'coffee_type',
  'coffee_concentration',
  'rating',
  'note',
  'set_custom_brew_time',
  'attachments',
  'tds',
  'brew_beverage_quantity',
];

/** Values of the stored brew, one or two from each section. */
const STORED_WHILE = { brew_time: 25, coffee_blooming_time: 5 };
const STORED_AFTER = { brew_quantity: 300, note: 'Too bitter', rating: 3 };

const SECTIONS = [
  {
    hidden: 'While brewing',
    shown: 'After brewing',
    parameters: WHILE_PARAMETERS,
    // Editing empties the values of hidden parameters (cleanInvisibleBrewData),
    // also those recorded before they were hidden.
    afterEdit: { ...STORED_AFTER, brew_time: 0, coffee_blooming_time: 0 },
  },
  {
    hidden: 'After brewing',
    shown: 'While brewing',
    parameters: AFTER_PARAMETERS,
    afterEdit: { ...STORED_WHILE, brew_quantity: 0, note: '', rating: 0 },
  },
] as const;

const SCOPES = ['in the settings', 'by the custom parameters of the method'];

interface StoredBrew {
  config: { uuid: string };
  brew_time: number;
  coffee_blooming_time: number;
  brew_quantity: number;
  grind_weight: number;
  note: string;
  rating: number;
}

async function storedBrews(page: Page): Promise<StoredBrew[]> {
  return (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
}

function hide(parameters: Parameters, names: readonly ParameterName[]): void {
  for (const name of names) {
    parameters[name] = false;
  }
}

type Method = FirstBrewData['PREPARATION'][number];

/** Gives a method parameters of its own, starting with the global ones. */
function customParameters(data: FirstBrewData, method: Method): Parameters {
  method.use_custom_parameters = true;
  method.manage_parameters = { ...data.SETTINGS[0].manage_parameters };
  return method.manage_parameters;
}

/** A second filter method, which sorts before the V60. */
function addKalita(data: FirstBrewData): Method {
  const kalita = structuredClone(data.PREPARATION[0]);
  kalita.name = 'Kalita Wave';
  kalita.config.uuid = '3d1c3f0e-5a5e-4b8e-9f43-2a1f6f0c7b11';
  data.PREPARATION.push(kalita);
  return kalita;
}

const heading = (page: Page, name: string) =>
  page.getByRole('heading', { name, exact: true, level: 2 });

/**
 * Opens the brew form by an action and waits until it has filled itself in. Without the section
 * "After brewing" the form has no creation date to wait for, so it waits for the bean.
 */
async function openForm(page: Page, open: () => Promise<void>): Promise<void> {
  await open();
  await page.getByRole('button', { name: 'Save' }).click({ trial: true });
  await expect(
    page.getByRole('button', { name: /^Bean Type, / }),
  ).toBeVisible();
}

for (const section of SECTIONS) {
  for (const scope of SCOPES) {
    test(`without a shown parameter "${section.hidden}" ${scope}, a new brew and an edited one are saved`, async ({
      page,
    }) => {
      await startWithFirstBrew(page, BREW_TEST_START, (data) => {
        Object.assign(data.BREWS[0], STORED_WHILE, STORED_AFTER);
        hide(
          scope === SCOPES[0]
            ? data.SETTINGS[0].manage_parameters
            : customParameters(data, data.PREPARATION[0]),
          section.parameters,
        );
      });
      const [stored] = await storedBrews(page);

      await openForm(page, () =>
        page
          .getByRole('button', { name: 'Add brew' })
          .filter({ visible: true })
          .click(),
      );
      await expect(heading(page, section.hidden)).toHaveCount(0);
      await expect(heading(page, section.shown)).toBeVisible();
      await fillBrewField(page, 'Ground Coffee (gr)', '16');
      await saveBrew(page);
      await expect.poll(async () => (await storedBrews(page)).length).toBe(2);
      expect((await storedBrews(page))[1]).toMatchObject({ grind_weight: 16 });

      // The new brew is listed first.
      await openForm(page, () => brewAction(page, 'Edit', 1));
      await expect(heading(page, section.hidden)).toHaveCount(0);
      await saveBrew(page);
      await expect
        .poll(
          async () =>
            (await storedBrews(page)).find(
              (brew) => brew.config.uuid === stored.config.uuid,
            ),
          { message: 'the edited brew' },
        )
        .toMatchObject(section.afterEdit);
    });
  }
}

test('a scale records a brew after the method the form opened with hid "While brewing"', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await startWithFirstBrew(page, BREW_TEST_START, (data) => {
    hide(customParameters(data, addKalita(data)), WHILE_PARAMETERS);
  });

  // The form opens with the method that sorts first.
  await openForm(page, () =>
    page
      .getByRole('button', { name: 'Add brew' })
      .filter({ visible: true })
      .click(),
  );
  await expect(
    page.getByRole('button', { name: 'Preparation method, Kalita Wave' }),
  ).toBeVisible();
  await expect(heading(page, 'While brewing')).toHaveCount(0);

  await chooseInBrewSelect(page, 'Preparation method', 'V60');
  await expect(heading(page, 'While brewing')).toBeVisible();
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByRole('button', { name: 'Pause timer' })).toBeVisible();
  await page.clock.fastForward(5000);

  // The web build simulates a scale while the timer runs: its weight lands in
  // the field and in the graph, which can then be downloaded.
  await expect(brewField(page, WATER)).not.toHaveValue(/^0?$/);
  await expect(
    page.getByRole('button', { name: 'Download flow profile' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause timer' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume timer' }),
  ).toBeVisible();
  await saveBrew(page);

  await expect.poll(async () => (await storedBrews(page)).length).toBe(2);
  const [, saved] = await storedBrews(page);
  expect(saved.brew_quantity).toBeGreaterThan(0);
});
