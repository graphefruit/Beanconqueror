import type { CameraPlugin } from '@capacitor/camera';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
  beanCard,
  beanField,
  dialogsClosed,
  findBean,
  saveBean,
  startWithBeans,
  storedBean,
  storedBeans,
} from './support/beans';
import { completeFirstRun } from './support/first-run';
import { NativeError } from './support/native';
import { toast } from './support/toast';

test('a user is told when the camera refuses to take a bean photo', async ({
  page,
  native,
}) => {
  // Message the Android Camera plugin rejects with when the permission is denied.
  await native.mockCapacitor<CameraPlugin>('Camera', {
    getPhoto: () => {
      throw new NativeError('User denied access to camera');
    },
  });
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await page.getByRole('button', { name: 'Add Photo' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();

  await expect(page.getByText('An error occurred')).toBeVisible();
  await expect(page.getByText(/User denied access to camera/)).toBeVisible();
  expect(await native.calls()).toContainEqual({
    plugin: 'Camera',
    method: 'getPhoto',
    mocked: true,
  });
});

/**
 * The tests below characterize how photos of a stored bean are shown and
 * removed today. The web build cannot read or delete photo files, so the
 * bean carries the address of an image of the app instead of a file path
 * (see `photoUrl` in `support/bean-data.ts`). Taking or choosing a photo,
 * and what happens to the files, cannot be reached in the browser.
 */
test.describe('a bean with a photo', () => {
  /** Shows the bean with the photo as the only card and returns the card. */
  async function startWithPhoto(page: Page, baseURL: string | undefined) {
    const data = await startWithBeans(page, {
      photoUrl: `${baseURL}/assets/img/empirical_water_spring.png`,
    });
    return { card: await findBean(page, BEANS.blend), data };
  }

  /** The photos of the form: one slide per photo, named "1 / 1", "1 / 2", … */
  const slides = (page: Page) =>
    page.getByRole('group', { name: /^\d+ \/ \d+$/ });

  async function deletePhotoInForm(page: Page, card: Locator): Promise<void> {
    await card.getByRole('button', { name: 'Bean options' }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(beanField(page, /^Name/)).toHaveValue(BEANS.blend);
    await expect(slides(page)).toHaveCount(1);
    // Known defect: the buttons on a photo (move left, move right, delete)
    // have no names; "delete" is the third.
    await slides(page).getByRole('button').nth(2).click();
    // Only in the web build, which has no file to delete; the photo is
    // taken off the bean in the form nevertheless.
    await expect(toast(page, 'Image could not be deleted')).toBeVisible();
    await expect(slides(page)).toHaveCount(0);
  }

  test('its first photo is shown on the card and opens the gallery', async ({
    page,
    baseURL,
  }) => {
    const { card } = await startWithPhoto(page, baseURL);

    const thumbnail = card.locator('async-image');
    await expect(thumbnail.getByRole('img')).toBeVisible();
    // A tap on the photo opens the gallery, not the details of the bean.
    await thumbnail.click();
    await expect(slides(page)).toHaveCount(1);
    await expect(
      page.getByRole('banner').getByText('Bean details'),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Back' }).click();
    await dialogsClosed(page);

    await card.getByRole('button', { name: 'Bean options' }).click();
    await page.getByRole('button', { name: 'Photo Gallery' }).click();
    await expect(slides(page)).toHaveCount(1);
  });

  test('a bean without a photo has no gallery in its menu', async ({
    page,
  }) => {
    await startWithBeans(page);

    await beanCard(page, BEANS.alpha)
      .getByRole('button', { name: 'Bean options' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Details', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Photo Gallery' }),
    ).toHaveCount(0);
    await expect(
      beanCard(page, BEANS.alpha).locator('async-image'),
    ).toHaveCount(0);
  });

  test('a photo deleted in the form stays on the bean when the form is cancelled', async ({
    page,
    baseURL,
  }) => {
    const { card, data } = await startWithPhoto(page, baseURL);

    await deletePhotoInForm(page, card);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await dialogsClosed(page);

    // On a device the file is deleted at once, before "Save" (known defect):
    // there the bean would keep a photo whose file is gone.
    expect(await storedBeans(page)).toEqual(data.BEANS);
    await expect(card.locator('async-image').getByRole('img')).toBeVisible();
  });

  test('a photo deleted in the form is taken off the bean when the form is saved', async ({
    page,
    baseURL,
  }) => {
    const { card } = await startWithPhoto(page, baseURL);

    await deletePhotoInForm(page, card);
    await saveBean(page);

    expect((await storedBean(page, BEANS.blend)).attachments).toEqual([]);
    await expect(card.locator('async-image')).toHaveCount(0);
  });
});
