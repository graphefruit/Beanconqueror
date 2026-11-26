import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanCard,
  beanField,
  dialogsClosed,
  findBean,
  showTab,
  startWithBeans,
  storedBean,
} from './support/beans';

/**
 * Characterization of the bean details as they are shown today: a read-only
 * dialog with the same three tabs as the form. Its title is the only level-1
 * heading; labels and values are text, sections are level 2.
 */

test('a tap on a card shows the details of the bean on three tabs', async ({
  page,
}) => {
  await startWithBeans(page);

  await (await findBean(page, BEANS.blend)).getByText(BEANS.blend).click();
  await expect(page.getByText(BEANS.blend, { exact: true })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Bean details' }),
  ).toBeVisible();

  // What each tab shows is checked by unit tests.
  const details = page.locator('ion-modal').last();
  await showTab(page.getByRole('tab', { name: 'Frozen information' }));
  await expect(details.getByText('Freezing storage type:')).toBeVisible();
  await showTab(page.getByRole('tab', { name: 'Variety information' }));
  await expect(
    details.getByRole('heading', { name: /^3\.\sBean Type$/ }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
});

test('a bean edited from its details is shown with the new values', async ({
  page,
}) => {
  await startWithBeans(page);
  await (await findBean(page, 'Gamma')).getByText(BEANS.blend).click();
  await expect(page.getByText(BEANS.blend, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit bean' }).click();
  await expect(page.getByRole('banner').getByText('Edit bean')).toBeVisible();
  await beanField(page, /^Name/).fill('Gamma Neu');
  await page.getByRole('button', { name: 'Save' }).click();

  // The form closes, the details stay open.
  await expect(
    page.getByRole('banner').getByText('Bean details'),
  ).toBeVisible();
  await expect(page.getByText('Gamma Neu', { exact: true })).toBeVisible();
  expect((await storedBean(page, 'Gamma Neu')).bean_information).toHaveLength(
    3,
  );

  await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
  await expect(beanCard(page, 'Gamma Neu')).toBeVisible();
});
