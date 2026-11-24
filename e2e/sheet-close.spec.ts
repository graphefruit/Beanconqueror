import { expect, test } from './fixtures';
import { BEANS, createBeanDataSet } from './support/bean-data';
import {
  BEAN_TEST_NOW,
  beanCard,
  dialogsClosed,
  startWithBeans,
} from './support/beans';
import { BREW_TEST_START, openAddBrew } from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { openFromProfile } from './support/profile';
import { seedDatabase } from './support/seed';

/**
 * Sheets without a cancel button of their own end with "Close dialog" while
 * VoiceOver or TalkBack is on (unit tests of the button). The web build has
 * no screen reader, as for a sighted user who swipes the sheet away instead.
 */
test('an actions menu shows no close button without a screen reader', async ({
  page,
}) => {
  await startWithBeans(page);
  const options = beanCard(page, BEANS.alpha)
    .first()
    .getByRole('button', { name: /^Options for / })
    .first();
  await options.click();
  await expect(page.locator('actions-popover ion-item').first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Close dialog' })).toHaveCount(
    0,
  );
  await page.keyboard.press('Escape');
  await dialogsClosed(page);
});

test('the device menu of the brew form shows no close button without a screen reader', async ({
  page,
}) => {
  await page.clock.install({ time: BREW_TEST_START });
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openAddBrew(page);
  await page.getByRole('button', { name: 'Brew options' }).click();
  await expect(
    page.locator('app-settings-popover-bluetooth-actions ion-item').first(),
  ).toBeVisible();

  await expect(page.getByRole('button', { name: 'Close dialog' })).toHaveCount(
    0,
  );
});

test('closing the green bean sort without choosing keeps the sort', async ({
  page,
}) => {
  const base = createBeanDataSet({ now: BEAN_TEST_NOW });
  await page.clock.install({ time: BEAN_TEST_NOW });
  await seedDatabase(page, {
    ...base,
    GREEN_BEANS: [
      {
        name: 'Green bean',
        note: '',
        date: '',
        config: { ...base.BEANS[0].config, uuid: 'green-uuid' },
        aromatics: '',
        weight: 1000,
        finished: false,
        cost: 0,
        attachments: [],
        cupping_points: '',
        decaffeinated: false,
        url: '',
        ean_article_number: '',
        rating: 0,
        bean_information: [],
      },
    ],
    SETTINGS: [{ ...base.SETTINGS[0], show_roasting_section: true }],
  });
  await page.goto('/');
  await openFromProfile(page, 'Bean Roasting');
  const sort = page.getByRole('button', { name: 'Sort green beans' });
  await sort.click();
  const apply = page.getByRole('button', { name: 'Apply filter' });
  await expect(apply).toBeVisible();

  // Closed without data, as by swiping it away, which the page once read
  // without a check.
  await page.keyboard.press('Escape');
  await expect(apply).toHaveCount(0);
  await expect(sort).toBeVisible();
});
