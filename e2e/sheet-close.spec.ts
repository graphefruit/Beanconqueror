import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import { beanCard, dialogsClosed, startWithBeans } from './support/beans';
import { BREW_TEST_START, openAddBrew } from './support/brew-form';
import { startWithFirstBrew } from './support/first-brew';

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
  await startWithFirstBrew(page, BREW_TEST_START);
  await openAddBrew(page);
  await page.getByRole('button', { name: 'Brew options' }).click();
  await expect(
    page.locator('app-settings-popover-bluetooth-actions ion-item').first(),
  ).toBeVisible();

  await expect(page.getByRole('button', { name: 'Close dialog' })).toHaveCount(
    0,
  );
});
