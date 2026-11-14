import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { pressHardwareBack } from './support/back-button';
import { BEANS } from './support/bean-data';
import {
  beanCards,
  beanNames,
  beanSegment,
  dialogsClosed,
  LIST_HEIGHT_ERROR,
  NO_BEAN_FILTER,
  openBeansTab,
  searchBeans,
  showBeanSegment,
  startWithBeans,
  storedBeanFilters,
} from './support/beans';
import { readStoredValue } from './support/stored-values';

/**
 * Characterization of searching, filtering and sorting the bean list as it
 * works today. Each segment has its own search text, filter and sort order;
 * filter and sort order are stored, the search text is not.
 */

test.use({ allowedConsoleErrors: [LIST_HEIGHT_ERROR] });

const BY_NAME = [
  BEANS.alpha,
  BEANS.ethiopia,
  BEANS.overused,
  BEANS.small,
  BEANS.blend,
  BEANS.thawed,
  BEANS.portionSource,
];

async function available(page: Page, counter: string): Promise<void> {
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    `Available ${counter}`,
  );
}

async function storedBeanSort(page: Page): Promise<unknown> {
  const [settings] =
    (await readStoredValue<{ bean_sort: unknown }[]>(page, 'SETTINGS')) ?? [];
  return settings?.bean_sort;
}

function searchField(page: Page) {
  return page.getByRole('searchbox').filter({ visible: true });
}

test('the search finds beans by parts of their name, roaster or varieties', async ({
  page,
}) => {
  await startWithBeans(page);
  await page.getByRole('button', { name: 'Collapse bean list items' }).click();

  // The roaster, whatever the case.
  await searchBeans(page, 'NORD');
  await available(page, '( 1 / 7 )');
  expect(await beanNames(page)).toEqual([BEANS.alpha]);

  // The country of a variety.
  await searchBeans(page, 'ethiopia');
  await expect.poll(() => beanNames(page)).toEqual([BEANS.blend]);
  await available(page, '( 1 / 7 )');

  // A comma separates alternatives.
  await searchBeans(page, 'nord, süd');
  await available(page, '( 2 / 7 )');
  expect(await beanNames(page)).toEqual([BEANS.alpha, BEANS.blend]);

  await searchBeans(page, 'a,');
  await available(page, '( 6 / 7 )');
  expect(await beanNames(page)).not.toContain(BEANS.small);
  // Known defect: with a blank after the comma every bean is found.
  await searchBeans(page, 'a, ');
  await available(page, '( 7 )');
  expect(await beanNames(page)).toEqual(BY_NAME);
});

test('each segment has its own search text, which is not stored', async ({
  page,
}) => {
  await startWithBeans(page);

  await searchBeans(page, 'nord');
  await available(page, '( 1 / 7 )');

  await showBeanSegment(page, 'Frozen');
  await expect(searchField(page)).toHaveValue('');
  await expect(beanCards(page)).toHaveCount(2);
  // The frozen beans are searched by the id of their bag as well.
  await searchBeans(page, 'zp2');
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 1 / 4 )',
  );

  await showBeanSegment(page, 'Available');
  await expect(searchField(page)).toHaveValue('nord');
  await available(page, '( 1 / 7 )');

  await page.reload();
  await openBeansTab(page);
  await expect(searchField(page)).toHaveValue('');
  await available(page, '( 7 )');
});

test('a filter applies to its segment, is stored and can be reset', async ({
  page,
}) => {
  await startWithBeans(page);
  const filter = page.getByRole('button', { name: 'Filter beans' });
  const activeFilter = page.getByRole('button', {
    name: 'Filter beans (active)',
  });
  const favourites = page.getByRole('switch', { name: 'Only favorites' });

  await filter.click();
  await favourites.click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await dialogsClosed(page);

  await available(page, '( 1 / 7 )');
  expect(await beanNames(page)).toEqual([BEANS.alpha]);
  await expect(activeFilter).toBeVisible();
  await expect(beanSegment(page, 'Archive')).toHaveAccessibleName(
    'Archive ( 3 )',
  );
  await expect
    .poll(() => storedBeanFilters(page))
    .toEqual({
      OPEN: { ...NO_BEAN_FILTER, favourite: true },
      FROZEN: NO_BEAN_FILTER,
      ARCHIVED: NO_BEAN_FILTER,
    });

  // The filter is still there after a restart.
  await page.reload();
  await openBeansTab(page);
  await available(page, '( 1 / 7 )');

  // Leaving the dialog without one of its buttons changes nothing.
  await page.getByRole('button', { name: /^Filter beans/ }).click();
  await expect(favourites).toBeChecked();
  await favourites.click();
  await pressHardwareBack(page);
  await dialogsClosed(page);
  await available(page, '( 1 / 7 )');

  await page.getByRole('button', { name: /^Filter beans/ }).click();
  await page.getByRole('button', { name: 'Reset filter' }).click();
  await dialogsClosed(page);
  await available(page, '( 7 )');
  await expect(filter).toBeVisible();
  await expect
    .poll(() => storedBeanFilters(page))
    .toEqual({
      OPEN: NO_BEAN_FILTER,
      FROZEN: NO_BEAN_FILTER,
      ARCHIVED: NO_BEAN_FILTER,
    });
});

test('the roast date filter of the web build starts yesterday and can leave the list empty', async ({
  page,
}) => {
  await startWithBeans(page);

  await page.getByRole('button', { name: 'Filter beans' }).click();
  // On a device a tap opens the date picker. The web build has none and
  // sets yesterday instead. The two date fields have no names.
  const from = page.getByPlaceholder('DD.MM.YYYY').first();
  await from.click();
  await expect(from).toHaveValue('28.02.2026');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await dialogsClosed(page);

  // No bean was roasted since yesterday; beans without a roast date are
  // filtered out as well. The toolbar stays, so the filter can be changed.
  await available(page, '( 0 / 7 )');
  await expect(beanCards(page)).toHaveCount(0);
  await expect(page.getByText("You're out of fresh beans!")).toBeVisible();
  await expect(searchField(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Filter beans (active)' }),
  ).toBeVisible();
});

test('the list is sorted by name in both directions and the order is stored', async ({
  page,
}) => {
  await startWithBeans(page);
  await page.getByRole('button', { name: 'Collapse bean list items' }).click();
  await expect.poll(() => beanNames(page)).toEqual(BY_NAME);
  const unsorted = { sort_after: 'UNKOWN', sort_order: 'UNKOWN' };

  // A criterion without a direction sorts ascending.
  await page.getByRole('button', { name: 'Sort beans' }).click();
  await page.getByText('Bean name', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await dialogsClosed(page);

  // Known defect: sorted by name the letters are compared by their code, so
  // "Ä" comes after "Z"; without a sort order it follows "A".
  const sorted = [...BY_NAME.filter((name) => name !== BEANS.ethiopia)];
  await expect.poll(() => beanNames(page)).toEqual([...sorted, BEANS.ethiopia]);
  await expect(
    page.getByRole('button', { name: 'Sort beans (active)' }),
  ).toBeVisible();
  await expect
    .poll(() => storedBeanSort(page))
    .toEqual({
      OPEN: { sort_after: 'NAME', sort_order: 'ASCENDING' },
      FROZEN: unsorted,
      ARCHIVED: unsorted,
    });

  await page.getByRole('button', { name: /^Sort beans/ }).click();
  await page.getByText('Descending', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await dialogsClosed(page);
  await expect
    .poll(() => beanNames(page))
    .toEqual([BEANS.ethiopia, ...sorted.reverse()]);

  // The order is still there after a restart.
  await page.reload();
  await openBeansTab(page);
  await expect(beanCards(page)).toHaveCount(7);
  expect((await beanNames(page))[0]).toBe(BEANS.ethiopia);

  await page.getByRole('button', { name: /^Sort beans/ }).click();
  await page.getByRole('button', { name: 'Reset filter' }).click();
  await dialogsClosed(page);
  await expect.poll(() => beanNames(page)).toEqual(BY_NAME);
  await expect
    .poll(() => storedBeanSort(page))
    .toEqual({
      OPEN: { sort_after: 'UNKOWN', sort_order: 'UNKOWN' },
      FROZEN: unsorted,
      ARCHIVED: unsorted,
    });
});
