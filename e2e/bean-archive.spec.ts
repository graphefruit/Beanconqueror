import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanAction,
  beanCard,
  beanCards,
  beanSegment,
  dialogsClosed,
  LIST_HEIGHT_ERROR,
  NO_BEAN_FILTER,
  openBeansTab,
  showBeanSegment,
  startWithBeans,
  storedBean,
  storedBeanFilters,
} from './support/beans';
import { topDialog } from './support/brew-form';
import { toast } from './support/toast';

/**
 * Characterization of archiving a bean and bringing it back as it works
 * today, including what happens to the filters of the bean list.
 */

test.use({ allowedConsoleErrors: [LIST_HEIGHT_ERROR] });

const NO_FILTERS = {
  OPEN: NO_BEAN_FILTER,
  FROZEN: NO_BEAN_FILTER,
  ARCHIVED: NO_BEAN_FILTER,
};

test('a bean is archived with a rating and a note and can be brought back', async ({
  page,
}) => {
  await startWithBeans(page);

  await beanAction(page, BEANS.alpha, 'Archive');
  await expect(page.getByText('Average Brew Rating')).toBeVisible();
  // The brews are rated 4 and 2; their average is offered as the rating of
  // the bean, which has none yet.
  await expect(topDialog(page)).toMatchAriaSnapshot(`
    - dialog:
      - heading "Name:" [level=2]
      - heading "Alpha Filter" [level=3]
      - heading "Average Brew Rating" [level=2]
      - heading "3" [level=3]
      - text: Rating 3
      - 'slider "3 Rating: 3 out of 5 stars"'
      - 'img "Rating: 3 out of 5 stars"'
      - text: Notes
      - textbox "Notes"
      - button "Cancel"
      - button "Archive"
  `);
  await page.getByRole('textbox', { name: 'Notes' }).fill('Leer getrunken');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();

  await expect(toast(page, 'Bean has been archived')).toBeVisible();
  await dialogsClosed(page);
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 6 )',
  );
  await expect(beanSegment(page, 'Archive')).toHaveAccessibleName(
    'Archive ( 4 )',
  );
  expect(await storedBean(page, BEANS.alpha)).toMatchObject({
    finished: true,
    rating: 3,
    note: 'Leer getrunken',
  });

  await showBeanSegment(page, 'Archive');
  await beanCard(page, BEANS.alpha)
    .getByRole('button', { name: 'Bean options' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Archive', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Unarchive', exact: true }).click();

  await expect(toast(page, 'Bean has been unarchived')).toBeVisible();
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 7 )',
  );
  await expect(beanSegment(page, 'Archive')).toHaveAccessibleName(
    'Archive ( 3 )',
  );
  // The rating and the note of the archiving stay.
  expect(await storedBean(page, BEANS.alpha)).toMatchObject({
    finished: false,
    rating: 3,
    note: 'Leer getrunken',
  });
  // Both steps set the filters of the list and of the bean chooser to "no
  // filter".
  await expect.poll(() => storedBeanFilters(page)).toEqual(NO_FILTERS);
  await expect
    .poll(() => storedBeanFilters(page, 'bean_filter_selection'))
    .toEqual(NO_FILTERS);
});

test('opening the archive dialog resets the filters of all segments, even when it is cancelled', async ({
  page,
}) => {
  await startWithBeans(page, {
    settings: {
      bean_filter: {
        OPEN: NO_BEAN_FILTER,
        FROZEN: { ...NO_BEAN_FILTER, favourite: true },
        ARCHIVED: NO_BEAN_FILTER,
      },
    },
  });
  // No frozen bean is a favourite.
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 0 / 4 )',
  );

  await beanAction(page, BEANS.alpha, 'Archive');
  await expect(page.getByText('Average Brew Rating')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);

  expect((await storedBean(page, BEANS.alpha)).finished).toBe(false);
  // Known defect: the filters are reset although nothing was archived.
  await expect.poll(() => storedBeanFilters(page)).toEqual(NO_FILTERS);

  // Known defect: the list on screen still filters by what it read when the
  // tab was opened, although nothing is stored any more.
  await showBeanSegment(page, 'Frozen');
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 0 / 4 )',
  );
  await expect(
    page.getByRole('button', { name: 'Filter beans (active)' }),
  ).toBeVisible();
  await expect(beanCards(page)).toHaveCount(0);

  // Entering the tab again reads the filters anew.
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await openBeansTab(page);
  await expect(beanSegment(page, 'Frozen')).toHaveAccessibleName(
    'Frozen ( 2 / 4 )',
  );
  await expect(beanCards(page)).toHaveCount(2);
  await expect.poll(() => storedBeanFilters(page)).toEqual(NO_FILTERS);
});
