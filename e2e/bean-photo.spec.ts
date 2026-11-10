import type { CameraPlugin } from '@capacitor/camera';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { NativeError } from './support/native';

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
