import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  backToBrews,
  BREW_TEST_START,
  brewAction,
  brewField,
  openAddBrew,
  openBrewParameterPage,
  setParameter,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';

/**
 * Screen readers (VoiceOver, TalkBack) and the Tab key follow the markup,
 * not the screen. The brew form and the brew details therefore have to
 * place their fields in the configured order in the markup itself, so blind
 * users hear them in the order sighted users see them. Each test starts
 * like the brew parameter tests: one bean, a V60, one grinder and one brew.
 */

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

/** Drags "Brew Temperature" above "Bean Type" in the global sort order. */
async function sortBrewTemperatureFirst(page: Page): Promise<void> {
  await openBrewParameterPage(page, 'Sort parameters');
  // See brew-parameters.spec.ts: the drag handle has no accessible name yet.
  const row = (label: string) =>
    page.locator('ion-item').filter({
      has: page.getByText(label, { exact: true }),
    });
  const handle = row('Brew Temperature').locator('ion-reorder');
  const target = row('Bean Type');

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
  await expect(
    page.getByRole('main').filter({ hasText: 'Before brewing' }),
  ).toContainText(/Before brewing\s*Brew Temperature\s*Bean Type/);
  await backToBrews(page);
}

/** A section card ("Before brewing", …) of the dialog on top. */
function section(page: Page, title: string): Locator {
  // Ionic projects modal content into the dialog through a slot, so the
  // card is found below the modal element rather than its dialog role.
  return page
    .locator('ion-modal')
    .last()
    .locator('ion-card')
    .filter({ has: page.getByText(title, { exact: true }) });
}

interface Row {
  label: string;
  top: number;
}

/**
 * The rows of a section in the order of the markup, with their position on
 * screen. The section title and the closing spacer are left out, and so are
 * rows without height (the brew graph while no device is connected), which
 * have no place on screen to compare.
 */
async function rowsOf(card: Locator): Promise<Row[]> {
  return card.evaluate((element) =>
    [...element.children]
      .filter(
        (row) =>
          !row.querySelector('.ion-title') &&
          !row.classList.contains('last-item'),
      )
      .map((row) => {
        const box = row.getBoundingClientRect();
        // Ionic keeps the label of inputs and selects in a property.
        const control = row.querySelector<Element & { label?: string }>(
          'ion-input, ion-select, ion-textarea',
        );
        const text =
          control?.label ||
          row.querySelector('h2')?.textContent ||
          row.querySelector('ion-label')?.textContent ||
          row.textContent ||
          row.tagName.toLowerCase();
        return {
          label: text.trim().replace(/\s+/g, ' '),
          top: box.top,
          height: box.height,
        };
      })
      .filter((row) => row.height > 0)
      .map(({ label, top }) => ({ label, top })),
  );
}

/**
 * Expects a section to list its rows in the markup in the order they are
 * shown from top to bottom, and returns that order.
 */
async function expectReadingOrder(
  page: Page,
  title: string,
): Promise<string[]> {
  const card = section(page, title);
  await expect(card).toBeVisible();
  const rows = await rowsOf(card);
  const markup = rows.map((row) => row.label);
  const screen = [...rows]
    .sort((a, b) => a.top - b.top)
    .map((row) => row.label);
  expect(markup, `${title}: markup order equals screen order`).toEqual(screen);
  return markup;
}

test('the brew form reads its fields in the sorted order', async ({
  page,
}, testInfo) => {
  test.fail();
  await sortBrewTemperatureFirst(page);
  await openAddBrew(page);

  expect(await expectReadingOrder(page, 'Before brewing')).toEqual([
    'Brew Temperature',
    'Bean Type',
    'Ground Coffee (gr)',
    'Grinder',
    'Grind Setting',
    'Preparation method',
  ]);
  await expectReadingOrder(page, 'While brewing');
  // Not sorted here, but the default order already shows the beverage
  // quantity between the amount of water and the rating.
  await expectReadingOrder(page, 'After brewing');

  await testInfo.attach('before brewing (aria snapshot)', {
    body: await section(page, 'Before brewing').ariaSnapshot(),
    contentType: 'text/plain',
  });
});

test('the brew details read their fields in the sorted order', async ({
  page,
}, testInfo) => {
  test.fail();
  await sortBrewTemperatureFirst(page);
  await brewAction(page, 'Details');

  expect(await expectReadingOrder(page, 'Before brewing')).toEqual([
    'Brew Temperature:',
    'Bean Type:',
    'Brew Ratio:',
    'Ground Coffee (gr):',
    'Grinder:',
    'Grind Setting:',
    'Preparation method:',
  ]);
  await expectReadingOrder(page, 'While brewing');
  await expectReadingOrder(page, 'After brewing');

  await testInfo.attach('before brewing (aria snapshot)', {
    body: await section(page, 'Before brewing').ariaSnapshot(),
    contentType: 'text/plain',
  });
});

test('the brew graph stays in the brew form when the brew time is hidden', async ({
  page,
}) => {
  await openBrewParameterPage(page, 'Manage parameters');
  await setParameter(page, 'Time', false);
  await backToBrews(page);

  await openAddBrew(page);
  await expect(brewField(page, 'Time')).toHaveCount(0);
  await expect(brewField(page, 'Bloom Time / Pre-infusion')).toBeVisible();
  // The graph runs the brew with connected devices (scale, pressure, brew by
  // weight); the section header reads it to offer its controls.
  await expect(
    section(page, 'While brewing').locator('brew-brewing-graph'),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Maximize controls' }),
  ).toBeVisible();
  await expectReadingOrder(page, 'While brewing');
});

test('Tab moves through the brew form in the sorted order', async ({
  page,
}) => {
  test.fail();
  await sortBrewTemperatureFirst(page);
  await openAddBrew(page);

  const fields = [
    brewField(page, 'Brew Temperature'),
    page.getByRole('button', { name: /^Bean Type, / }),
    brewField(page, 'Ground Coffee (gr)'),
    page.getByRole('button', { name: /^Grinder, / }),
    brewField(page, 'Grind Setting'),
    page.getByRole('button', { name: /^Preparation method, / }),
  ];
  const tops: number[] = [];
  for (const field of fields) {
    tops.push(await top(field));
  }
  expect(tops, 'fields are listed in screen order').toEqual(
    [...tops].sort((a, b) => a - b),
  );

  // Note which field each Tab press lands on, starting at the dialog header.
  const reached: number[] = [];
  for (let press = 0; press < 30 && reached.length < fields.length; press++) {
    await page.keyboard.press('Tab');
    for (const [index, field] of fields.entries()) {
      const focused = await field.evaluate(
        (element) =>
          (element.getRootNode() as Document | ShadowRoot).activeElement ===
          element,
      );
      if (focused && !reached.includes(index)) {
        reached.push(index);
      }
    }
  }
  expect(reached, 'fields in the order Tab reaches them').toEqual([
    0, 1, 2, 3, 4, 5,
  ]);
});
