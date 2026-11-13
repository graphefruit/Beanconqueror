import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { readStoredValue } from './support/stored-values';

interface StoredEntry {
  config: {
    uuid: string;
    unix_timestamp: number;
    created_at?: number;
    updated_at?: number;
    rev?: number;
    updated_by?: string;
  };
}

test('entries added through the app carry change info of this device', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);

  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  expect(device?.device_id).toBeTruthy();

  for (const key of ['BEANS', 'PREPARATION', 'MILL', 'BREWS']) {
    const entries = await readStoredValue<StoredEntry[]>(page, key);
    expect(entries, key).toHaveLength(1);
    const config = entries![0].config;
    expect(config.rev, key).toBeGreaterThanOrEqual(1);
    expect(config.updated_by, key).toBe(device!.device_id);
    expect(config.created_at, key).toBeGreaterThan(0);
    expect(config.updated_at, key).toBeGreaterThanOrEqual(config.created_at!);
    // The unix timestamp keeps its meaning (seconds of the creation).
    expect(
      Math.abs(config.unix_timestamp - config.created_at! / 1000),
      key,
    ).toBeLessThan(2);
  }

  const settings = await readStoredValue<
    Array<{ config?: StoredEntry['config'] }>
  >(page, 'SETTINGS');
  expect(settings?.[0].config?.rev).toBeUndefined();
});
