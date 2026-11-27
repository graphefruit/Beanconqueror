import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';
import { readStoredValue } from './support/stored-values';
import { mainTabName } from './support/texts';

/**
 * The optional sections are switched on a page of their own in the profile:
 * roasting, water and graphs. Grinders are always there and have no switch.
 * That the settings no longer repeat the switches is checked by their unit
 * tests.
 */

interface StoredSettings {
  show_water_section: boolean;
  manage_parameters: { water: boolean };
}

async function storedSettings(page: Page): Promise<StoredSettings> {
  const settings = await readStoredValue<StoredSettings[]>(page, 'SETTINGS');
  return settings![0]!;
}

async function openSections(page: Page): Promise<void> {
  await openFromProfile(page, 'More sections');
  await expect(page).toHaveURL(/\/home\/profile\/sections$/);
}

const SWITCHES = [
  { name: 'Bean Roasting', description: 'Green beans, roasting machines' },
  { name: 'Water', description: 'Water recipes and their minerals' },
  { name: 'Graphs', description: 'Reference curves for brewing' },
];

test('the profile opens the section switches and leads back', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSections(page);

  const banner = page.getByRole('banner').filter({ hasText: 'More sections' });
  await expect(
    banner.getByText('More sections', { exact: true }),
  ).toBeVisible();
  const switches = page.locator('app-sections').getByRole('switch');
  await expect(switches).toHaveCount(SWITCHES.length);
  // As in the profile hub, the description is part of each switch's name.
  for (const [index, { name, description }] of SWITCHES.entries()) {
    await expect(switches.nth(index)).toHaveAccessibleName(
      `${name} ${description}`,
    );
    await expect(switches.nth(index)).not.toBeChecked();
  }
  await expect(
    page.getByRole('tab', { name: mainTabName('Profile') }),
  ).toHaveAttribute('aria-selected', 'true');

  await banner.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
});

test('water switched on by keyboard joins the profile, records the water and stays on', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSections(page);

  const water = page.getByRole('switch', { name: 'Water' });
  await water.focus();
  await page.keyboard.press('Space');
  await expect(water).toBeChecked();
  await expect
    .poll(async () => {
      const settings = await storedSettings(page);
      return [settings.show_water_section, settings.manage_parameters.water];
    })
    .toEqual([true, true]);

  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
  await expect(page.getByRole('link', { name: /^Water/ })).toBeVisible();

  await page.reload();
  await openSections(page);
  await expect(page.getByRole('switch', { name: 'Water' })).toBeChecked();
});

test('a section switched off leaves the profile again', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSections(page);
  const graphs = page.getByRole('switch', { name: 'Graphs' });
  await graphs.click();
  await expect(graphs).toBeChecked();
  await graphs.click();
  await expect(graphs).not.toBeChecked();

  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
  await expect(page.getByRole('link', { name: /^Graphs/ })).toHaveCount(0);
});

test('the switches are not cut off at 200 % text size', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSections(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  const switches = page.locator('app-sections ion-toggle');
  await expect(switches).toHaveCount(SWITCHES.length);
  const clipped = await switches.evaluateAll((toggles) =>
    toggles.flatMap((toggle) =>
      [
        ...toggle.shadowRoot!.querySelectorAll(
          '.label-text-wrapper, .helper-text',
        ),
      ]
        .filter(
          (part) =>
            part.scrollWidth > part.clientWidth + 1 ||
            part.getBoundingClientRect().right > window.innerWidth,
        )
        .map((part) => part.textContent?.trim()),
    ),
  );
  expect(clipped).toEqual([]);
  const width = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(width.content).toBeLessThanOrEqual(width.viewport);
});
