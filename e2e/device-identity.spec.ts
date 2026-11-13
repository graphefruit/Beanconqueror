import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { readStoredValue } from './support/stored-values';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface StoredDevice {
  device_id: string;
  created_at: number;
}

interface StoredSettings {
  matomo_analytics_id: string;
  user: { experience_mode: string };
}

test('a new installation gets a stable device id and the beginner mode', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await expect
    .poll(
      async () =>
        (await readStoredValue<StoredDevice>(page, 'DEVICE'))?.device_id,
    )
    .toMatch(UUID_V4);
  const firstStart = await readStoredValue<StoredDevice>(page, 'DEVICE');
  const settings = await readStoredValue<StoredSettings[]>(page, 'SETTINGS');
  expect(settings?.[0].user.experience_mode).toBe('beginner');
  expect(firstStart?.device_id).not.toBe(settings?.[0].matomo_analytics_id);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Add brew' })).toBeVisible();

  expect(await readStoredValue<StoredDevice>(page, 'DEVICE')).toEqual(
    firstStart,
  );
  const settingsAfterReload = await readStoredValue<StoredSettings[]>(
    page,
    'SETTINGS',
  );
  expect(settingsAfterReload?.[0].user.experience_mode).toBe('beginner');
});
