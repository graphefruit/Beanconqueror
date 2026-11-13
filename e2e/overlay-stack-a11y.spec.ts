import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  BREW_TEST_START,
  brewAction,
  brewField,
  openAddBrew,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { completeFirstRun } from './support/first-run';
import { openTab } from './support/layout';

/**
 * VoiceOver and TalkBack must only find the overlay on top. The app opens
 * sheets above the page and stacks dialogs: the aroma picker above the tasting
 * notes, a sheet above the brew form, a choice list above the bean form.
 * Otherwise touching the empty space of the top dialog, or having the screen
 * read from the top, reads what lies underneath. Everything below the top
 * overlay stays open but is inert and hidden from the accessibility tree until
 * the top one closes; then focus returns to the control that opened it.
 */

/**
 * A control of a dialog below the top one. Role locators leave out what
 * screen readers cannot reach, so it is only found with `includeHidden`.
 */
function behind(
  page: Page,
  role: 'button' | 'textbox',
  name: string | RegExp,
): Locator {
  return page.getByRole(role, {
    name,
    exact: typeof name === 'string',
    disabled: false,
    includeHidden: true,
  });
}

/**
 * Whether keyboard focus is in the overlay that holds `control`. Controls
 * often sit in shadow roots, so the way up leaves them through their host.
 */
function focusIsInOverlayOf(control: Locator): Promise<boolean> {
  return control.evaluate((element) => {
    let node: Node | null = element;
    while (
      node &&
      !(node instanceof Element && node.matches('ion-modal, ion-alert'))
    ) {
      node = node instanceof ShadowRoot ? node.host : node.parentNode;
    }
    return node?.contains(document.activeElement) ?? false;
  });
}

/** Ionic moves focus into an overlay once it has finished opening. */
async function waitUntilOpen(control: Locator): Promise<void> {
  await expect.poll(() => focusIsInOverlayOf(control)).toBe(true);
}

/** Everything a screen reader can reach, as Playwright's aria snapshot. */
function accessibilityTree(page: Page): Promise<string> {
  return page.locator('body').ariaSnapshot();
}

/**
 * Focus cannot be moved into an inert dialog. With Ionic's focus trap alone it
 * would get in and be pulled back to the first or, as Playwright focuses
 * twice, the last control of the top dialog, so `focused` must be neither.
 */
async function expectFocusStaysOn(
  focused: Locator,
  target: Locator,
): Promise<void> {
  await waitUntilOpen(focused);
  await focused.focus();
  await expect(focused).toBeFocused();
  await target.focus();
  await expect(focused).toBeFocused();
  expect(await focusIsInOverlayOf(target)).toBe(false);
}

test('a half-height sheet keeps the page and its tab bar out of reach', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openTab(page, 'Beans');
  const importBeans = page.getByRole('button', { name: 'Import beans' });
  await importBeans.focus();
  await page.keyboard.press('Enter');
  const scanQrCode = page.getByRole('button', { name: 'Scan QR Code' });
  await expect(scanQrCode).toBeVisible();

  // The page shows above the sheet, but neither its content nor the side
  // menu and tab bar next to it can be reached.
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(importBeans).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Beans' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'menu' })).toHaveCount(0);
  // Ionic would pull focus to one of the two actions, so the drag handle
  // of the sheet is the probe.
  await expectFocusStaysOn(
    page.getByRole('button', { name: /^Activate to adjust the size/ }),
    behind(page, 'button', 'Import beans'),
  );
  await expect(behind(page, 'button', 'Import beans')).not.toBeFocused();

  await page.keyboard.press('Escape');
  await expect(scanQrCode).toHaveCount(0);
  await expect(importBeans).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Beans' })).toBeVisible();
});

test('the aroma picker hides the tasting dialog until it closes', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await brewAction(page, 'Cupping');
  const addAromas = page.getByRole('button', { name: 'Add aromas/flavors' });
  await expect(addAromas).toBeVisible();

  // Opened from the keyboard, so Ionic knows where focus has to return.
  await addAromas.focus();
  await page.keyboard.press('Enter');
  const lime = page.getByRole('checkbox', { name: 'Lime', exact: true });
  await expect(lime).toBeVisible();

  // Only the picker is left in the accessibility tree …
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(addAromas).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Aroma' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Brews' })).toHaveCount(0);
  const tree = await accessibilityTree(page);
  expect(tree).toContain('Aromas / Flavors');
  expect(tree).not.toContain('Tasting');
  expect(tree.match(/- dialog\b/g)).toHaveLength(1);

  // … while the tasting dialog is still open behind it, out of reach.
  const hiddenAddAromas = behind(page, 'button', 'Add aromas/flavors');
  await expect(hiddenAddAromas).toHaveCount(1);
  await expectFocusStaysOn(
    page.getByRole('button', { name: 'Cancel' }),
    hiddenAddAromas,
  );
  // Tab and Shift+Tab at both ends of the picker stay out of it as well.
  await page.getByRole('button', { name: 'Save' }).focus();
  await page.keyboard.press('Tab');
  expect(await focusIsInOverlayOf(hiddenAddAromas)).toBe(false);
  await page.getByRole('button', { name: 'Back' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await focusIsInOverlayOf(hiddenAddAromas)).toBe(false);

  await page.keyboard.press('Escape');
  await expect(lime).toHaveCount(0);
  await expect(addAromas).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Aroma' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('a sheet hides the brew form, also where the form shows above it', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openAddBrew(page);
  const groundCoffee = brewField(page, 'Ground Coffee (gr)');
  await expect(groundCoffee).toBeVisible();

  const options = page.getByRole('button', { name: 'Brew options' });
  await options.focus();
  await page.keyboard.press('Enter');
  const connectPressure = page.getByRole('button', {
    name: 'Connect pressure',
  });
  await expect(connectPressure).toBeVisible();

  // The sheet covers half of the screen; the brew form still shows above it
  // but is out of the accessibility tree.
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(groundCoffee).toHaveCount(0);
  const tree = await accessibilityTree(page);
  expect(tree).toContain('Connect scale');
  expect(tree).not.toContain('Ground Coffee');
  await expectFocusStaysOn(
    connectPressure,
    behind(page, 'textbox', 'Ground Coffee (gr)'),
  );

  await page.keyboard.press('Escape');
  await expect(connectPressure).toHaveCount(0);
  await expect(options).toBeFocused();
  await expect(groundCoffee).toBeVisible();

  // A tap on the form's Back button above the sheet only closes the sheet.
  await page.keyboard.press('Enter');
  await waitUntilOpen(connectPressure);
  const back = behind(page, 'button', 'Back');
  await expect(back).toHaveCount(1);
  const box = (await back.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(connectPressure).toHaveCount(0);
  await expect(groundCoffee).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('three dialogs stacked at first start are peeled off one by one', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Don't activate" }).click();
  const welcome = page.getByRole('group', { name: '2 / 5' });
  const addBean = welcome.getByRole('button', { name: 'Add bean' });
  await addBean.focus();
  await page.keyboard.press('Enter');

  const beanName = page.getByRole('textbox', {
    name: /^Name/,
    disabled: false,
  });
  await expect(beanName).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(1);

  const roastType = page.getByRole('button', { name: /^Roast type/ });
  await roastType.focus();
  await page.keyboard.press('Enter');
  const choices = page.getByRole('alertdialog', { name: 'Roast type' });
  await expect(choices).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(beanName).toHaveCount(0);
  await expect(welcome).toHaveCount(0);
  const cancel = choices.getByRole('button', { name: 'Cancel' });
  await expectFocusStaysOn(cancel, behind(page, 'textbox', /^Name/));

  await page.keyboard.press('Enter');
  await expect(choices).toHaveCount(0);
  await expect(roastType).toBeFocused();
  await expect(beanName).toBeVisible();
  await expect(welcome).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(beanName).toHaveCount(0);
  await expect(addBean).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});
