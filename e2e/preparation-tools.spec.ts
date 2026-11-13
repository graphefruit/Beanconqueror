import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import {
  backToBrews,
  brewAction,
  openBrewParameterPage,
  saveBrew,
  setParameter,
  showBrewsTab,
} from './support/brew-form';
import { completeFirstRunWithBrew } from './support/first-brew';
import { readStoredValue } from './support/stored-values';

interface StoredConfig {
  uuid: string;
  rev?: number;
  updated_at?: number;
}

interface StoredBrew {
  config: StoredConfig;
  method_of_preparation_tools: string[];
}

interface StoredPreparation {
  config: StoredConfig;
  tools: Array<{ name: string; config: StoredConfig }>;
}

// Setup plus several page changes; under parallel load this can exceed the
// default 30 s.
test.describe.configure({ timeout: 60_000 });

const toolsField = (page: Page) =>
  page.getByRole('textbox', { name: 'Preparation tools' });

/** Opens the edit dialog of the V60 on the preparation methods page. */
async function editPreparationMethod(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Preparation options' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(toolsField(page)).toBeVisible();
}

/**
 * Picks a tool in the brew form. Like the other choosers of the brew form, a
 * tap during the form's animation can get lost, so it is repeated until the
 * chooser shows up.
 */
async function chooseTool(page: Page, tool: string): Promise<void> {
  const select = page.getByRole('button', { name: /^Preparation tools, / });
  const checkbox = page.getByRole('checkbox', { name: tool });
  await expect(async () => {
    if ((await page.getByRole('dialog').count()) < 2) {
      await select.click({ force: true });
    }
    await expect(checkbox).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 20_000 });
  await checkbox.click();
  await page.getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(
    page.getByRole('button', { name: `Preparation tools, ${tool}` }),
  ).toBeVisible();
}

test('deleting a preparation tool removes it from the brews that used it', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);
  await openBrewParameterPage(page, 'Manage parameters');
  await setParameter(page, 'Preparation tools', true);
  await backToBrews(page);

  await page.getByRole('tab', { name: 'Profile' }).click();
  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await editPreparationMethod(page);
  await toolsField(page).fill('Scale');
  await page.getByRole('button', { name: 'Add tool' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await showBrewsTab(page);
  await brewAction(page, 'Edit');
  await chooseTool(page, 'Scale');
  await saveBrew(page);

  const [preparation] =
    (await readStoredValue<StoredPreparation[]>(page, 'PREPARATION')) ?? [];
  const [brew] = (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
  if (!preparation || !brew) {
    throw new Error('Expected a stored preparation method and brew');
  }
  const [tool] = preparation.tools;
  expect(tool?.name).toBe('Scale');
  expect(brew.method_of_preparation_tools).toEqual([tool.config.uuid]);

  // The tab still shows the preparation methods page.
  await page.getByRole('tab', { name: 'Profile' }).click();
  await editPreparationMethod(page);
  await page.getByText('Scale', { exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('alertdialog');
  await confirm.getByRole('button', { name: 'Yes' }).click();
  await expect(confirm).toBeHidden();
  await expect(page.getByText('Scale', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await expect
    .poll(async () => {
      const [stored] =
        (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
      return stored?.method_of_preparation_tools;
    })
    .toEqual([]);
  const [storedBrew] =
    (await readStoredValue<StoredBrew[]>(page, 'BREWS')) ?? [];
  expect(storedBrew.config.rev).toBe(brew.config.rev! + 1);
  expect(storedBrew.config.updated_at).toBeGreaterThan(brew.config.updated_at!);

  const [storedPreparation] =
    (await readStoredValue<StoredPreparation[]>(page, 'PREPARATION')) ?? [];
  expect(storedPreparation.tools).toEqual([]);
  expect(storedPreparation.config.rev).toBe(preparation.config.rev! + 1);
});
