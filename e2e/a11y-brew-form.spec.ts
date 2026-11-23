import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BREW_TEST_START, openAddBrew } from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { tabKey } from './support/keyboard';
import { waitForAnimations } from './support/layout';

/**
 * The brew form for keyboard and screen reader users. Each test starts like
 * the brew parameter tests: one bean, a V60, one grinder and one brew.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
});

/**
 * Marks the element that has focus, down through shadow roots, so it can be
 * located; the host of an Ionic control matches `:focus` as well. Returns
 * whether it is the element marked first, i.e. focus has gone round.
 */
async function markFocused(page: Page): Promise<boolean> {
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
      return false;
    }
    return marks.e2eFirstStop === element;
  });
}

test('every Tab stop of the brew form has a name', async ({ page }) => {
  await openAddBrew(page);
  const focused = page.locator('[data-e2e-tab-stop]');

  const stops: string[] = [];
  const unnamed: string[] = [];
  for (let press = 0; press < 80; press++) {
    await page.keyboard.press(tabKey(page));
    if (await markFocused(page)) {
      break;
    }
    // An element without a role, such as the host of an Ionic button with a
    // tabindex, has no name of its own even when the button inside it has.
    const stop = await focused.evaluate(
      (element) =>
        `${element.tagName.toLowerCase()} after ${element.parentElement?.closest('ion-item')?.textContent?.trim().slice(0, 30) ?? ''}`,
    );
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
  await openAddBrew(page);

  // Ionic draws the visible field over its button, so a tap lands on the
  // field; TalkBack and VoiceOver activate the button itself.
  for (const [label, option] of [
    ['Bean Type', 'Ethiopia Yirgacheffe Natural'],
    ['Grinder', 'Comandante C40'],
  ]) {
    const select = page.getByRole('button', { name: `${label}, ${option}` });
    const radio = page.getByRole('radio', { name: new RegExp(`^${option}`) });
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
