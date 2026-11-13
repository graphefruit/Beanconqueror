import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { readStoredValue } from './support/stored-values';

interface StoredEntry {
  config: { uuid: string; rev?: number };
}

interface StoredNote {
  collection: string;
  uuid: string;
  deleted_at: number;
  device_id: string;
  rev: number;
}

test('deleting a brew removes it at once and keeps a local note of it', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);

  const [brew] = (await readStoredValue<StoredEntry[]>(page, 'BREWS')) ?? [];
  const device = await readStoredValue<{ device_id: string }>(page, 'DEVICE');
  expect(brew?.config.uuid).toBeTruthy();
  expect(await readStoredValue(page, 'DELETION_JOURNAL')).toBeNull();

  await page.getByRole('button', { name: 'Brew options' }).first().click();
  await page.getByRole('button', { name: 'Delete' }).click();
  const confirm = page.getByRole('alertdialog');
  await confirm.getByRole('button', { name: 'Yes' }).click();

  // The toast is shown once the deletion was stored. Waiting for it and for
  // the dialog to close makes sure the list is checked with the background
  // visible again, not while the dialog hides it.
  await expect(confirm).toBeHidden();
  await expect(page.getByText('Brew has been deleted')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Brew options' })).toHaveCount(
    0,
  );
  await expect
    .poll(() => readStoredValue<StoredEntry[]>(page, 'BREWS'))
    .toEqual([]);
  await expect
    .poll(() => readStoredValue<StoredNote[]>(page, 'DELETION_JOURNAL'))
    .toEqual([
      {
        collection: 'BREWS',
        uuid: brew!.config.uuid,
        deleted_at: expect.any(Number),
        device_id: device!.device_id,
        rev: brew!.config.rev ?? 0,
      },
    ]);
});
