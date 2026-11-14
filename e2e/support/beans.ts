import { expect, type Locator, type Page } from '@playwright/test';

import {
  createBeanDataSet,
  type BeanDataOptions,
  type BeanDataSet,
} from './bean-data';
import { BREW_TEST_START } from './brew-form';
import { seedDatabase } from './seed';
import { readStoredValue } from './stored-values';

/**
 * Helpers for the bean list, the bean cards and the bean dialogs. Elements are located by role
 * and accessible name where the app gives them one.
 */

/** The time the bean tests set the browser clock to. */
export const BEAN_TEST_NOW = BREW_TEST_START;

/**
 * Known defect: when a segment with beans is shown for the first time or the list is collapsed,
 * the list changes its height during Angular's change detection. The development build, which
 * the tests run against, reports that on the console; nothing is visibly wrong. Tests that
 * switch segments or collapse the list allow exactly this message.
 */
export const LIST_HEIGHT_ERROR =
  /NG0100: ExpressionChangedAfterItHasBeenCheckedError.*'height'.*AgVirtualScrollComponent/;

/** A bean as the app stores it; only the fields the tests read. */
export interface StoredBean {
  name: string;
  roaster: string;
  note: string;
  weight: number;
  cost: number;
  rating: number;
  finished: boolean;
  favourite: boolean;
  beanMix: string;
  roast: string;
  roastingDate: string;
  frozenDate: string;
  unfrozenDate: string;
  frozenId: string;
  frozenGroupId: string;
  frozenNote: string;
  attachments: string[];
  bean_information: { country?: string; percentage?: number }[];
  config: {
    uuid: string;
    unix_timestamp: number;
    created_at?: number;
    updated_at?: number;
    rev?: number;
    updated_by?: string;
  };
}

/**
 * Starts the app as an installation that already holds the bean test data, with the browser
 * clock at `BEAN_TEST_NOW`, and shows the bean list. Returns the data the app started with.
 */
export async function startWithBeans(
  page: Page,
  options: Omit<BeanDataOptions, 'now'> = {},
): Promise<BeanDataSet> {
  const data = createBeanDataSet({ ...options, now: BEAN_TEST_NOW });
  await page.clock.install({ time: BEAN_TEST_NOW });
  await seedDatabase(page, data);
  await page.goto('/');
  await openBeansTab(page);
  return data;
}

export async function openBeansTab(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Beans', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add bean' }).filter({ visible: true }),
  ).toHaveCount(1);
}

/**
 * One of the tabs "Available", "Frozen" and "Archive" above the list. Its name ends with the
 * number of entries, "( 7 )", or with "( shown / all )".
 */
export function beanSegment(
  page: Page,
  name: 'Available' | 'Frozen' | 'Archive',
): Locator {
  return page.getByRole('tab', { name: new RegExp(`^${name} \\(`) });
}

export async function showBeanSegment(
  page: Page,
  name: 'Available' | 'Frozen' | 'Archive',
): Promise<void> {
  await showTab(beanSegment(page, name));
}

/**
 * Selects a tab of a segment. Ionic layers the segment button over its inner tab, so the tap is
 * forced through to where a finger would land; during a transition it can get lost, so tap until
 * the tab is selected.
 */
export async function showTab(tab: Locator): Promise<void> {
  await expect(async () => {
    await tab.click({ force: true });
    await expect(tab).toHaveAttribute('aria-selected', 'true', {
      timeout: 1000,
    });
  }).toPass();
}

/**
 * The cards of the list on screen. A card has neither a role nor a name yet, so it is found by
 * its element. Tab pages stay in the document, hence the filter.
 */
export function beanCards(page: Page): Locator {
  return page.locator('bean-information').filter({ visible: true });
}

/**
 * The card of the bean with this name. The card of a group contains the cards of its further
 * members, so a name shared by a group matches several cards, the group's first.
 */
export function beanCard(page: Page, name: string): Locator {
  return beanCards(page).filter({
    has: page.locator('.ion-title').getByText(name),
  });
}

/**
 * The names on the cards on screen, from top to bottom, without the icons in front of a name
 * (a thawed bean has its snowflake in brackets) and the "(Filter)" roast hint behind it.
 */
export async function beanNames(page: Page): Promise<string[]> {
  const titles = await beanCards(page).locator('.ion-title').allInnerTexts();
  return titles.map((title) =>
    title
      .replace(/\s+/g, ' ')
      .replace(/^\s*\( ?\)/, '')
      .replace(/\(\w+\)\s*$/, '')
      .trim(),
  );
}

/**
 * The value a card shows below one of its labels ("Brews", "Consumed", "1. Country", …). Label
 * and value are plain texts in one cell.
 */
export function beanCardValue(card: Locator, label: string): Locator {
  return card
    .locator('ion-label.card-headline')
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) })
    .locator('xpath=../ion-text');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Types into the search field above the list and leaves the field. The list is filtered 750 ms
 * after the last key and once more when the field is left; a tap on a card right after typing
 * would hit the list while it is rebuilt.
 */
export async function searchBeans(page: Page, text: string): Promise<void> {
  const search = page.getByRole('searchbox').filter({ visible: true });
  await search.fill(text);
  await search.blur();
}

/**
 * Searches for a bean by its name and returns its card once it is the only one left. The list
 * only renders the cards near the screen and builds them anew while it scrolls, so a card
 * further down cannot be tapped reliably; the search brings it to the top.
 */
export async function findBean(page: Page, name: string): Promise<Locator> {
  await searchBeans(page, name);
  await expect(beanCards(page)).toHaveCount(1);
  const card = beanCard(page, name);
  await expect(card).toBeVisible();
  return card;
}

/** Opens the menu of a bean card and picks an entry. */
export async function beanAction(
  page: Page,
  name: string,
  action: string,
): Promise<void> {
  await beanCard(page, name)
    .first()
    .getByRole('button', { name: 'Bean options' })
    .first()
    .click();
  await page.getByRole('button', { name: action, exact: true }).click();
}

/**
 * Holds a finger on a card for longer than the 500 ms that make a long press. The time passes on
 * the browser clock, which the bean tests install.
 */
export async function longPress(page: Page, card: Locator): Promise<void> {
  const target = card.locator('ion-card').first();
  await target.dispatchEvent('touchstart');
  await page.clock.runFor(600);
  await target.dispatchEvent('touchend');
}

/**
 * A text field of a bean dialog. Ionic's scroll assist briefly shows a disabled copy of a
 * focused input with the same name; the user only ever types into the enabled one.
 */
export function beanField(page: Page, name: string | RegExp): Locator {
  return page.getByRole('textbox', {
    name,
    exact: typeof name === 'string',
    disabled: false,
  });
}

export async function openAddBean(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: 'Add bean' })
    .filter({ visible: true })
    .click();
  // A trial click waits until the modal has finished sliding in.
  await page.getByRole('button', { name: 'Save' }).click({ trial: true });
}

/** Saves the bean dialog and waits until it is closed. */
export async function saveBean(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save' }).click();
  await dialogsClosed(page);
}

/** The page behind the dialogs, where it or what it sits in is hidden from assistive technology. */
const HIDDEN_PAGE =
  'ion-router-outlet#menu-content:is([aria-hidden="true"], [inert]), ' +
  ':is([aria-hidden="true"], [inert]) ion-router-outlet#menu-content';

/**
 * Waits until no dialog, question or menu is open any more and the page behind them is back for
 * assistive technology, and with it for every locator by role.
 */
export async function dialogsClosed(page: Page): Promise<void> {
  await expect(
    page.locator('ion-modal, ion-alert, ion-action-sheet, ion-popover'),
  ).toHaveCount(0);
  await expect(page.locator(HIDDEN_PAGE)).toHaveCount(0);
}

/** The filter of a segment as the app stores it when nothing is filtered. */
export const NO_BEAN_FILTER = {
  favourite: false,
  rating: { upper: 5, lower: 0 },
  roast_range: { upper: 5, lower: 0 },
  bean_roasting_type: [],
  roastingDateStart: '',
  roastingDateEnd: '',
};

/** The stored filters of the bean list ("OPEN", "FROZEN", "ARCHIVED") or of the bean chooser. */
export async function storedBeanFilters(
  page: Page,
  key: 'bean_filter' | 'bean_filter_selection' = 'bean_filter',
): Promise<Record<string, unknown> | undefined> {
  const [settings] =
    (await readStoredValue<Record<string, Record<string, unknown>>[]>(
      page,
      'SETTINGS',
    )) ?? [];
  return settings?.[key];
}

export async function storedBeans(page: Page): Promise<StoredBean[]> {
  return (await readStoredValue<StoredBean[]>(page, 'BEANS')) ?? [];
}

/** The stored beans with this name. */
export async function storedBeansNamed(
  page: Page,
  name: string,
): Promise<StoredBean[]> {
  return (await storedBeans(page)).filter((bean) => bean.name === name);
}

/** The stored bean with this name; fails when there is none or more than one. */
export async function storedBean(
  page: Page,
  name: string,
): Promise<StoredBean> {
  const beans = await storedBeansNamed(page, name);
  if (beans.length !== 1) {
    throw new Error(
      `Expected one stored bean "${name}", found ${beans.length}`,
    );
  }
  return beans[0];
}

/** The bean of the data set with this name; for groups the first one. */
export function seededBean(
  data: BeanDataSet,
  name: string,
): BeanDataSet['BEANS'][number] {
  const bean = data.BEANS.find((entry) => entry.name === name);
  if (!bean) {
    throw new Error(`The data set has no bean "${name}"`);
  }
  return bean;
}
