import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  BREW_TEST_START,
  brewField,
  openAddBrew,
  WATER,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { tabKey } from './support/keyboard';
import { waitForAnimations } from './support/layout';
import { textStops } from './support/screen-reader';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';

/**
 * The brew form for keyboard and screen reader users. The tests of the form
 * as a whole start like the brew parameter tests: one bean, a V60, one grinder
 * and one brew, added through the UI.
 */

async function startWithBrew(page: Page): Promise<void> {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
}

/**
 * Marks the element that has focus, down through shadow roots, so it can be
 * located; the host of an Ionic control matches `:focus` as well. Returns
 * where it is, or null once it is the element marked first, i.e. focus has
 * gone round. One call per stop: the walk has 30 of them.
 */
async function markFocused(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const marks = window as unknown as {
      e2eFirstStop?: Element | null;
      e2eTabStop?: Element | null;
    };
    marks.e2eTabStop?.removeAttribute('data-e2e-tab-stop');
    let element = document.activeElement;
    while (element?.shadowRoot?.activeElement) {
      element = element.shadowRoot.activeElement;
    }
    element?.setAttribute('data-e2e-tab-stop', '');
    marks.e2eTabStop = element;
    if (marks.e2eFirstStop === undefined) {
      marks.e2eFirstStop = element;
    } else if (marks.e2eFirstStop === element) {
      return null;
    }
    // An element without a role, such as the host of an Ionic button with a
    // tabindex, has no name of its own even when the button inside it has.
    return `${element?.tagName.toLowerCase()} after ${element?.parentElement?.closest('ion-item')?.textContent?.trim().slice(0, 30) ?? ''}`;
  });
}

test('every Tab stop of the brew form has a name', async ({ page }) => {
  // In WebKit on CI the first run of a worker spends up to 23 s in the setup
  // above, and the 31 stops take 7 s more.
  test.slow();
  await startWithBrew(page);
  await openAddBrew(page);
  const focused = page.locator('[data-e2e-tab-stop]');

  const stops: string[] = [];
  const unnamed: string[] = [];
  for (let press = 0; press < 80; press++) {
    await page.keyboard.press(tabKey(page));
    const stop = await markFocused(page);
    if (stop === null) {
      break;
    }
    stops.push(stop);
    try {
      await expect(focused).toHaveAccessibleName(/\S/, { timeout: 500 });
    } catch {
      unnamed.push(stop);
    }
  }

  expect(stops.length, 'focus goes round the form').toBeGreaterThan(15);
  expect(unnamed, 'Tab stops without a name').toEqual([]);
});

test('the choosers of the brew form open from a tap and from a screen reader', async ({
  page,
}) => {
  // Stored data instead of the first run through the UI: in WebKit on CI the
  // first test of a worker spends 22 s in that, and the four choosers below
  // take 10 s more, past the 30 s a test has.
  const data = generateDataSet({
    brews: 1,
    beans: 1,
    archivedBeanShare: 0,
    endDate: BREW_TEST_START,
  });
  await page.clock.install({ time: BREW_TEST_START });
  await seedDatabase(page, data);
  await page.goto('/');
  await openAddBrew(page);

  // Ionic draws the visible field over its button, so a tap lands on the
  // field; TalkBack and VoiceOver activate the button itself.
  for (const label of ['Bean Type', 'Grinder']) {
    const select = page.getByRole('button', { name: `${label}, ` });
    const option = (await select.getAttribute('aria-label'))!.slice(
      label.length + 2,
    );
    const radio = page.getByRole('radio', {
      name: new RegExp(`^${option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    });
    for (const activate of [
      async () => {
        const box = (await select.boundingBox())!;
        await page.touchscreen.tap(
          box.x + box.width / 2,
          box.y + box.height / 2,
        );
      },
      () => select.dispatchEvent('click'),
    ]) {
      // A tap during the slide of the form or of the closing chooser is lost.
      await waitForAnimations(page);
      await activate();
      await expect(radio).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(radio).toHaveCount(0);
      await expect(select).toBeVisible();
    }
  }
});

test('a screen reader stops once on each field of the brew form', async ({
  page,
}) => {
  await startWithBrew(page);
  await openAddBrew(page);
  const form = page.locator('brew-brewing');

  // The label shown with a field is in the name of its control already.
  const labels = [
    'Preparation method',
    'Bean Type',
    'Grinder',
    'Amount of water',
    'Beverage quantity',
    'Rating',
    'Notes',
  ];
  await expect
    .poll(async () =>
      (await textStops(form)).filter((stop) =>
        labels.some((label) => stop.startsWith(label)),
      ),
    )
    .toEqual([]);

  await expect(
    form.getByRole('button', {
      name: 'Bean Type, Ethiopia Yirgacheffe Natural',
    }),
  ).toBeVisible();
  await expect(brewField(page, WATER)).toBeVisible();
  await expect(form.getByRole('slider', { name: 'Rating' })).toHaveAttribute(
    'aria-valuetext',
    '0 of 5',
  );
  await expect(
    form.getByRole('img', { name: 'Rating: 0 of 5 stars' }),
  ).toBeAttached();
});
