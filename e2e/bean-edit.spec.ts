import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { pressHardwareBack } from './support/back-button';
import { BEANS } from './support/bean-data';
import {
  beanAction,
  beanCard,
  beanCardValue,
  beanField,
  beanNames,
  beanSegment,
  dialogsClosed,
  longPress,
  saveBean,
  seededBean,
  showBeanSegment,
  startWithBeans,
  storedBean,
  storedBeans,
  tabName,
} from './support/beans';
import { readStoredValue } from './support/stored-values';
import { toast } from './support/toast';

/**
 * Characterization of editing a bean as it works today: what "Save" stores,
 * how the dialog is left without saving (with a question once something was
 * changed), and archiving from the dialog.
 */

const DISCARD_QUESTION = /Bean information has been changed/;

test('saving an edited bean stores only the changed values', async ({
  page,
}) => {
  const data = await startWithBeans(page);
  const before = seededBean(data, BEANS.alpha);

  await beanAction(page, BEANS.alpha, 'Edit');
  await expect(beanField(page, /^Name/)).toHaveValue(BEANS.alpha);
  await beanField(page, /^Name/).fill('Alpha Umbenannt');
  await beanField(page, 'Weight').fill('300');
  await beanField(page, 'Weight').blur();
  await saveBean(page);

  await expect(toast(page, 'Bean has been edited')).toBeVisible();
  const card = beanCard(page, 'Alpha Umbenannt');
  await expect(beanCardValue(card, 'Consumed')).toHaveText(
    '36.5g of 300g (263.5g)',
  );
  await expect(beanCard(page, BEANS.alpha)).toHaveCount(0);

  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  const after = await storedBean(page, 'Alpha Umbenannt');
  expect(after).toEqual({
    ...before,
    name: 'Alpha Umbenannt',
    weight: 300,
    config: {
      ...before.config,
      rev: 1,
      updated_at: expect.any(Number),
      updated_by: device?.device_id,
    },
  });
  // No other bean was written.
  const others = (await storedBeans(page)).filter(
    (bean) => bean.name !== 'Alpha Umbenannt',
  );
  expect(others).toEqual(
    data.BEANS.filter((bean) => bean.name !== BEANS.alpha),
  );
});

test('a long press on a card opens the bean for editing', async ({ page }) => {
  await startWithBeans(page);

  await longPress(page, beanCard(page, BEANS.small));

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('banner').getByText('Edit bean')).toBeVisible();
  await expect(beanField(page, /^Name/)).toHaveValue(BEANS.small);
});

/** Whether the focus is inside the open bean form (also inside its fields). */
async function focusInBeanForm(page: Page): Promise<boolean> {
  return page.evaluate(
    () => !!document.activeElement?.closest('ion-modal#bean-edit'),
  );
}

test('cancelling a changed bean asks before the changes are dropped', async ({
  page,
}) => {
  const data = await startWithBeans(page);
  await beanAction(page, BEANS.alpha, 'Edit');

  // Nothing changed: no question.
  await page.getByRole('button', { name: 'Cancel' }).click();
  await dialogsClosed(page);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await beanAction(page, BEANS.alpha, 'Edit');
  await beanField(page, /^Name/).fill('Verworfen');
  await page.getByRole('button', { name: 'Cancel' }).click();
  const question = page.getByRole('alertdialog');
  await expect(question).toContainText(DISCARD_QUESTION);
  await question.getByRole('button', { name: 'No' }).click();
  await expect(question).toHaveCount(0);
  await expect(beanField(page, /^Name/)).toHaveValue('Verworfen');
  await expect.poll(() => focusInBeanForm(page)).toBe(true);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await question.getByRole('button', { name: 'Yes' }).click();
  await dialogsClosed(page);
  await expect(beanCard(page, BEANS.alpha)).toBeVisible();
  expect(await storedBeans(page)).toEqual(data.BEANS);
});

test('the Android back key asks the same question, and a second back answers no', async ({
  page,
}) => {
  const data = await startWithBeans(page);
  await beanAction(page, BEANS.alpha, 'Edit');
  await beanField(page, /^Name/).fill('Verworfen');

  await pressHardwareBack(page);
  const question = page.getByRole('alertdialog');
  await expect(question).toContainText(DISCARD_QUESTION);

  // Back again while asking: no second question, the form stays.
  await pressHardwareBack(page);
  await expect(question).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(beanField(page, /^Name/)).toHaveValue('Verworfen');

  await pressHardwareBack(page);
  await expect(question).toHaveCount(1);
  await question.getByRole('button', { name: 'Yes' }).click();
  await dialogsClosed(page);
  expect(await storedBeans(page)).toEqual(data.BEANS);
});

test('Escape asks before a changed bean is dropped', async ({ page }) => {
  const data = await startWithBeans(page);
  await beanAction(page, BEANS.alpha, 'Edit');
  await beanField(page, /^Name/).fill('Verworfen');

  await page.keyboard.press('Escape');
  const question = page.getByRole('alertdialog');
  await expect(question).toContainText(DISCARD_QUESTION);
  await page.keyboard.press('Escape');
  await expect(question).toHaveCount(0);
  await expect(beanField(page, /^Name/)).toHaveValue('Verworfen');

  await page.keyboard.press('Escape');
  await question.getByRole('button', { name: 'Yes' }).click();
  await dialogsClosed(page);
  expect(await storedBeans(page)).toEqual(data.BEANS);
});

test('ticking "Archive?" in the dialog archives the bean without a rating question', async ({
  page,
}) => {
  await startWithBeans(page);

  await beanAction(page, BEANS.ethiopia, 'Edit');
  await page.getByRole('checkbox', { name: 'Archive?' }).click();
  await saveBean(page);

  await expect(toast(page, 'Bean has been edited')).toBeVisible();
  await dialogsClosed(page);
  await expect(beanSegment(page, 'Available')).toHaveAccessibleName(
    tabName('Available ( 6 )'),
  );
  await expect(beanSegment(page, 'Archive')).toHaveAccessibleName(
    tabName('Archive ( 4 )'),
  );
  expect(await storedBean(page, BEANS.ethiopia)).toMatchObject({
    finished: true,
    rating: 0,
  });

  await showBeanSegment(page, 'Archive');
  await expect(beanCard(page, BEANS.ethiopia)).toBeVisible();
  expect(await beanNames(page)).toContain(BEANS.ethiopia);
});
