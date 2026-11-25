import type { CameraPlugin } from '@capacitor/camera';
import type { FilePickerPlugin } from '@capawesome/capacitor-file-picker';
import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import {
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
  await expect(
    page.getByText(
      'Beanconqueror is not allowed to use the camera or your photos. You can allow access in the settings of your device.',
    ),
  ).toBeVisible();
  // The technical cause is for the log only.
  await expect(page.getByText(/User denied access to camera/)).toHaveCount(0);
  expect(await native.calls()).toContainEqual({
    plugin: 'Camera',
    method: 'getPhoto',
    mocked: true,
  });
});

test('closing the camera without a photo shows no error', async ({
  page,
  native,
}) => {
  // Message the Camera plugin rejects with on iOS and Android then.
  await native.mockCapacitor<CameraPlugin>('Camera', {
    getPhoto: () => {
      throw new NativeError('User cancelled photos app');
    },
  });
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await page.getByRole('button', { name: 'Add Photo' }).click();
  await page.getByRole('button', { name: 'Take photo' }).click();
  await expect
    .poll(() => native.calls())
    .toContainEqual({ plugin: 'Camera', method: 'getPhoto', mocked: true });
  // Open the choice again: an error shown for the closed camera is up by then.
  await page.getByRole('button', { name: 'Add Photo' }).click();

  await expect(page.getByRole('button', { name: 'Take photo' })).toBeVisible();
  await expect(page.getByText('An error occurred')).toHaveCount(0);
  await expect(page.getByText('The photo could not be added.')).toHaveCount(0);
});

test('closing the photo picker without a photo shows no error', async ({
  page,
  native,
}) => {
  // Message the FilePicker plugin rejects with on iOS, Android and the web then.
  await native.mockCapacitor<FilePickerPlugin>('FilePicker', {
    pickFiles: () => {
      throw new NativeError('pickFiles canceled.');
    },
  });
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await page.getByRole('button', { name: 'Add Photo' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect
    .poll(() => native.calls())
    .toContainEqual({
      plugin: 'FilePicker',
      method: 'pickFiles',
      mocked: true,
    });
  // Open the choice again: an error shown for the closed picker is up by then.
  await page.getByRole('button', { name: 'Add Photo' }).click();

  await expect(page.getByRole('button', { name: 'Choose' })).toBeVisible();
  await expect(page.getByText('An error occurred')).toHaveCount(0);
  await expect(page.getByText('The photo could not be added.')).toHaveCount(0);
});

test('a user is told when the photo picker fails', async ({ page, native }) => {
  await native.mockCapacitor<FilePickerPlugin>('FilePicker', {
    pickFiles: () => {
      throw new NativeError('Failed to open the photo library');
    },
  });
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  await page.getByRole('button', { name: 'Add Photo' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();

  await expect(page.getByText('An error occurred')).toBeVisible();
  await expect(page.getByText('The photo could not be added.')).toBeVisible();
  // The technical cause is for the log only.
  await expect(page.getByText(/Failed to open/)).toHaveCount(0);
});

/**
 * The tests below characterize how photos of a stored bean are shown and
 * removed today. The web build cannot read or delete photo files, so the
 * bean carries the address of an image of the app instead of a file path
 * (see `photoUrl` in `support/bean-data.ts`). Taking or choosing a photo,
 * and what happens to the files, cannot be reached in the browser; that the
 * file of a removed photo is only deleted after the save is covered by the
 * unit tests of `photo-add` and `UIImage`.
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
    await card.getByRole('button', { name: /^Options for / }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(beanField(page, /^Name/)).toHaveValue(BEANS.blend);
    await expect(slides(page)).toHaveCount(1);
    // Known defect: the buttons on a photo (move left, move right, delete)
    // have no names; "delete" is the third.
    await slides(page).getByRole('button').nth(2).click();
    // Only the form loses the photo here; the file is left to the save.
    await expect(toast(page, 'Image has been deleted')).toBeVisible();
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

    await card.getByRole('button', { name: /^Options for / }).click();
    await page.getByRole('button', { name: 'Photo Gallery' }).click();
    await expect(slides(page)).toHaveCount(1);
  });

  test('a photo deleted in the form stays on the bean when the form is cancelled', async ({
    page,
    baseURL,
  }) => {
    const { card, data } = await startWithPhoto(page, baseURL);

    await deletePhotoInForm(page, card);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Yes' })
      .click();
    await dialogsClosed(page);

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
