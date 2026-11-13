import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Helpers for the "Add brew" / "Edit brew" form and the brew parameter
 * settings. Everything is located by role and accessible name so the
 * characterization tests survive a rebuild of the brew form.
 */

/** Fixed start time for tests that freeze the clock before `page.goto`. */
export const BREW_TEST_START = new Date('2026-03-01T09:00:00');

/**
 * A text field of the brew form. Ionic's scroll assist briefly shows a
 * disabled copy of a focused input with the same name; the user only ever
 * types into the enabled one.
 */
export function brewField(page: Page, name: string | RegExp): Locator {
  return page.getByRole('textbox', {
    name,
    exact: typeof name === 'string',
    disabled: false,
  });
}

/** Types a value and leaves the field, which is when numbers are normalized. */
export async function fillBrewField(
  page: Page,
  name: string | RegExp,
  value: string,
): Promise<void> {
  const field = brewField(page, name);
  await field.fill(value);
  await field.blur();
}

/** "Amount of water" carries the live brew ratio in its accessible name. */
export const WATER = /^Amount of water/;
/** For espresso methods the ratio moves to "Beverage quantity". */
export const BEVERAGE = /^Beverage quantity/;

export async function openAddBrew(page: Page): Promise<void> {
  // Every tab page has its own add button; use the one on screen.
  await page
    .getByRole('button', { name: 'Add brew' })
    .filter({ visible: true })
    .click();
  // A trial click waits until the modal has finished sliding in.
  await page.getByRole('button', { name: 'Save' }).click({ trial: true });
  await expect(brewField(page, 'Creation Date')).toBeVisible();
}

export async function saveBrew(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/**
 * Picks an entry in one of the brew form's choosers (preparation method, bean,
 * grinder). Ionic layers the select's visible wrapper over its inner button,
 * so the tap is forced through to where a finger would land; keyboard Enter
 * is sometimes swallowed while the form is still settling.
 */
export async function chooseInBrewSelect(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  const select = page.getByRole('button', {
    name: new RegExp(`^${label}, `),
  });
  const radio = page.getByRole('radio', { name: new RegExp(`^${option}\\b`) });
  // While the form is still settling a tap can get lost; tap again only when
  // no chooser is on its way (the brew form itself is one dialog).
  await expect(async () => {
    if ((await page.getByRole('dialog').count()) < 2) {
      await select.click({ force: true });
    }
    await expect(radio).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 20_000 });
  await radio.click();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(
    page.getByRole('button', { name: `${label}, ${option}` }),
  ).toBeVisible();
}

/**
 * The dialog on top, for aria snapshots. The brew action sheet can still be in
 * the page while the dialog it opened is shown. Ionic projects modal content
 * into the dialog through a slot, so locators cannot be chained below it; the
 * page behind a modal is hidden from the accessibility tree, so page-level
 * locators find the modal's content.
 */
export function topDialog(page: Page): Locator {
  return page.getByRole('dialog').last();
}

/** The brew cards of the Brews tab (the page's inner main region). */
export function brewList(page: Page): Locator {
  return page.getByRole('main').getByRole('main');
}

/** Opens the action sheet of the n-th brew card in the current list. */
export async function brewAction(
  page: Page,
  action: string,
  index = 0,
): Promise<void> {
  await page.getByRole('button', { name: 'Brew options' }).nth(index).click();
  await page.getByRole('button', { name: action, exact: true }).click();
}

/**
 * Adds a preparation method from the built-in list ("Espresso Machine",
 * "French Press", …). The list entries have no button role yet, so they are
 * picked by their text.
 */
export async function addPreparationMethod(
  page: Page,
  type: string,
): Promise<void> {
  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await page.getByRole('button', { name: 'Add preparation method' }).click();
  await page.getByText(type, { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await showBrewsTab(page);
}

/**
 * Opens one page of "Brewing Parameters" from the side menu. The entries are
 * clickable cards without a button or link role, so they are found by text.
 */
export async function openBrewParameterPage(
  page: Page,
  entry:
    | 'Manage parameters'
    | 'Sort parameters'
    | 'Define default parameters'
    | 'Define repeat parameters',
): Promise<void> {
  // Tab pages stay in the page while a tab change animates, so the visible
  // menu button can be swapped out under the click; retry until it opens.
  const link = page.getByRole('link', { name: 'Brewing Parameters' });
  await expect(async () => {
    await page
      .getByRole('button', { name: 'menu' })
      .filter({ visible: true })
      .click({ timeout: 3000 });
    await expect(link).toBeVisible({ timeout: 3000 });
  }).toPass();
  await link.click();
  await page.getByText(entry, { exact: true }).click();
  await expect(
    page.getByRole('banner').filter({ hasText: entry }),
  ).toBeVisible();
}

/**
 * Leaves a brew parameter page and returns to the brew list through the side
 * menu and the Home tab.
 */
export async function backToBrews(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'back', exact: true }).click();
  await page
    .getByRole('banner')
    .filter({ hasText: 'Brewing Parameters' })
    .getByRole('button', { name: 'menu' })
    .click();
  await page.getByRole('link', { name: 'Home' }).click();
  await showBrewsTab(page);
}

/**
 * Switches to the Brews tab and waits until the previous tab page, which may
 * have its own menu, add and brew option buttons, is hidden again.
 */
export async function showBrewsTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Brews' }).click();
  await expect(page.getByRole('tab', { name: 'Brews' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'menu' }).filter({ visible: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole('button', { name: 'Add brew' }).filter({ visible: true }),
  ).toHaveCount(1);
}

/** Sets or clears a parameter checkbox; the label starts with the parameter name. */
export async function setParameter(
  page: Page,
  name: string,
  checked: boolean,
): Promise<void> {
  const box = page.getByRole('checkbox', {
    name: new RegExp(`^${escapeRegExp(name)}`),
  });
  // A click during the page transition can get lost; click until it sticks.
  await expect(async () => {
    if ((await box.getAttribute('aria-checked')) !== String(checked)) {
      await box.click();
    }
    await expect(box).toHaveAttribute('aria-checked', String(checked), {
      timeout: 1000,
    });
  }).toPass();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
