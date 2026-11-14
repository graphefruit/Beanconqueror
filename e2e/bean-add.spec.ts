import { expect, test } from './fixtures';
import { ROASTER_NORTH } from './support/bean-data';
import {
  BEAN_TEST_NOW,
  beanCard,
  beanCardValue,
  beanField,
  beanSegment,
  dialogsClosed,
  openAddBean,
  saveBean,
  searchBeans,
  startWithBeans,
  storedBean,
  storedBeans,
} from './support/beans';
import { chooseInBrewSelect, openAddBrew } from './support/brew-form';
import { readStoredValue } from './support/stored-values';
import { toast } from './support/toast';

/**
 * Characterization of adding a bean as it works today: the name is the only
 * mandatory field, the roaster is suggested from the stored beans, and the
 * new bean is stored with the defaults of a single origin bean.
 */

test('a bean cannot be saved without a name', async ({ page }) => {
  await startWithBeans(page);
  await openAddBean(page);

  // Known defect: without a name "Save" does nothing and says nothing; the
  // name is not marked as missing either.
  await beanField(page, 'Roaster').fill('Nameless');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(beanField(page, /^Name/)).not.toHaveAttribute(
    'aria-invalid',
    'true',
  );

  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
  expect(await storedBeans(page)).toHaveLength(14);
});

test('a new bean is stored with its values and can be brewed', async ({
  page,
}) => {
  await startWithBeans(page);
  await openAddBean(page);

  await beanField(page, /^Name/).fill('Test Kenia');

  // The roasters of the stored beans are suggested.
  await beanField(page, 'Roaster').pressSequentially('Rös');
  const suggestion = page.getByRole('button', {
    name: ROASTER_NORTH,
    exact: true,
  });
  await expect(suggestion).toBeVisible();
  // The list closes shortly after the field is left; a tap delivers the
  // press and the release at once, as a finger does.
  await suggestion.tap();
  await expect(beanField(page, 'Roaster')).toHaveValue(ROASTER_NORTH);

  // A decimal comma becomes a point when the field is left.
  await beanField(page, 'Weight').fill('250,5');
  await beanField(page, 'Weight').blur();
  await expect(beanField(page, 'Weight')).toHaveValue('250.5');

  // On a device a tap opens the date picker. The web build has none and
  // sets the current time instead.
  await beanField(page, 'Roast date').click();
  await expect(beanField(page, 'Roast date')).toHaveValue('01.03.2026');

  await saveBean(page);
  await expect(toast(page, 'Bean added successfully')).toBeVisible();
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    'Available ( 8 )',
  );
  await searchBeans(page, 'Kenia');
  const card = beanCard(page, 'Test Kenia');
  await expect(beanCardValue(card, 'Roaster')).toHaveText(ROASTER_NORTH);
  await expect(beanCardValue(card, 'Consumed')).toHaveText(
    '0g of 250.5g (250.5g)',
  );

  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  const bean = await storedBean(page, 'Test Kenia');
  expect(bean).toMatchObject({
    roaster: ROASTER_NORTH,
    weight: 250.5,
    beanMix: 'SINGLE_ORIGIN',
    roast: 'UNKNOWN',
    finished: false,
    frozenDate: '',
  });
  // The time of the tap; the clock runs on from the time it was set to.
  const roasted =
    new Date(bean.roastingDate).getTime() - BEAN_TEST_NOW.getTime();
  expect(roasted).toBeGreaterThanOrEqual(0);
  expect(roasted).toBeLessThan(60_000);
  // A single origin bean has exactly one, empty, variety.
  expect(bean.bean_information).toHaveLength(1);
  expect(bean.config.rev).toBe(1);
  expect(bean.config.updated_by).toBe(device?.device_id);

  await page.getByRole('tab', { name: 'Brews' }).click();
  await openAddBrew(page);
  await chooseInBrewSelect(page, 'Bean Type', 'Test Kenia');
});
