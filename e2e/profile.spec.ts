import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * The profile tab is a hub: everything that is not a tab of its own sits in
 * three groups, each entry with an icon, a title and a count or a short
 * description that screen readers hear as part of the link. Below them are the
 * community links and the legal pages.
 */

type Theme = 'light' | 'dark';

async function openProfile(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Profile' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function setTheme(page: Page, theme: Theme): Promise<void> {
  await page.evaluate(
    (dark) =>
      document.documentElement.classList.toggle('ion-palette-dark', dark),
    theme === 'dark',
  );
}

async function switchOnWater(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Settings/ }).click();
  const water = page.getByRole('checkbox', { name: 'Activate water section' });
  await water.scrollIntoViewIfNeeded();
  await water.click();
  await expect(water).toBeChecked();
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function addGrinder(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name: /^Grinders/ }).click();
  await page.getByRole('button', { name: 'Add grinder' }).click();
  await page.getByRole('textbox', { name: /^Name/ }).fill(name);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function archiveGrinder(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name: /^Grinders/ }).click();
  await page
    .locator('mill-information-card')
    .filter({ hasText: name })
    .getByRole('button', { name: 'Grinder options' })
    .click();
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function addWater(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name: /^Water/ }).click();
  await page.getByRole('button', { name: 'Add water recipe' }).click();
  await page.getByText('Pure Coffee Water', { exact: true }).click();
  await page.getByRole('textbox', { name: /^Name/ }).fill(name);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

/** The hub's entries, read from the groups so tab bar and footer are left out. */
function entries(page: Page) {
  return page.locator('app-profile ion-list').getByRole('link');
}

const ENTRY_NAMES = [
  'Preparation methods None added yet',
  'Grinders None added yet',
  'Statistics Your brews and beans in numbers',
  'Brewing Parameters Which fields a brew records',
  'Bean parameters Which fields a bean records',
  'Calculations Brew ratio, water hardness',
  'Settings Language, appearance, devices, backup',
  'Info & support Impressum, privacy, contact, logs',
];

test('the hub has a page heading, three groups and named entries', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Profile' }),
  ).toBeVisible();
  const groups = page.locator('app-profile').getByRole('heading', { level: 2 });
  await expect(groups).toHaveText(['Equipment', 'Sections', 'App']);

  // The description is part of each entry's name.
  await expect(entries(page)).toHaveCount(ENTRY_NAMES.length);
  for (const [index, name] of ENTRY_NAMES.entries()) {
    await expect(entries(page).nth(index)).toHaveAccessibleName(name);
  }
});

test('graphs and roasting join the sections once switched on', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  await page.getByRole('link', { name: /^Settings/ }).click();
  for (const name of ['Activate graph section', 'Activate roasting section']) {
    const toggle = page.getByRole('checkbox', { name });
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(toggle).toBeChecked();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);

  await expect(entries(page)).toHaveCount(ENTRY_NAMES.length + 2);
  await expect(entries(page).nth(6)).toHaveAccessibleName(
    'Graphs Reference curves for brewing',
  );
  await expect(entries(page).nth(7)).toHaveAccessibleName(
    'Bean Roasting Green beans, roasting machines',
  );
});

test('the footer names the community links and opens the legal pages', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  const content = page.locator('app-profile ion-content');
  for (const name of ['Instagram', 'Facebook', 'GitHub', 'Discord']) {
    const button = content.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.width, `${name} is wide enough to tap`).toBeGreaterThanOrEqual(
      44,
    );
    expect(box.height, `${name} is high enough to tap`).toBeGreaterThanOrEqual(
      44,
    );
  }

  for (const { name, url } of [
    { name: 'Impressum', url: /\/info\/impressum$/ },
    { name: 'Privacy', url: /\/info\/privacy$/ },
  ]) {
    await content.getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole('banner').getByText(name, { exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/home\/profile$/);
  }
});

test('the grinder entry counts the active grinders in its name', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  await addGrinder(page, 'Comandante C40');
  await expect(
    page.getByRole('link', { name: 'Grinders 1 grinder', exact: true }),
  ).toBeVisible();
  await addGrinder(page, 'Niche Zero');
  await expect(
    page.getByRole('link', { name: 'Grinders 2 grinders', exact: true }),
  ).toBeVisible();
});

test('archived grinders are left out of the count', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  await addGrinder(page, 'Comandante C40');
  await addGrinder(page, 'Niche Zero');
  await archiveGrinder(page, 'Niche Zero');
  await expect(
    page.getByRole('link', { name: 'Grinders 1 grinder', exact: true }),
  ).toBeVisible();
  await archiveGrinder(page, 'Comandante C40');
  await expect(
    page.getByRole('link', { name: 'Grinders None added yet', exact: true }),
  ).toBeVisible();
});

test('the water entry counts the water recipes in its name', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);
  await switchOnWater(page);

  await addWater(page, 'Tap water');
  await expect(
    page.getByRole('link', { name: 'Water 1 water', exact: true }),
  ).toBeVisible();
  await addWater(page, 'Filtered water');
  await expect(
    page.getByRole('link', { name: 'Water 2 waters', exact: true }),
  ).toBeVisible();
});

test('the water entry joins the equipment group once switched on', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);

  await switchOnWater(page);
  await expect(entries(page)).toHaveCount(ENTRY_NAMES.length + 1);
  await expect(entries(page).nth(2)).toHaveAccessibleName(
    'Water None added yet',
  );
});

test('every entry shows its icon', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);
  await switchOnWater(page);

  // An icon that is not registered stays an empty element without an error.
  const icons = page.locator('app-profile ion-content .entry-icon ion-icon');
  await expect(icons).toHaveCount(ENTRY_NAMES.length + 1);
  for (const icon of await icons.all()) {
    await expect
      .poll(() =>
        icon.evaluate(
          (element) =>
            element.shadowRoot?.querySelector('svg')?.childElementCount ?? 0,
        ),
      )
      .toBeGreaterThan(0);
  }
});

for (const { entry, url, shows, back } of [
  {
    entry: /^Preparation methods/,
    url: /\/home\/profile\/preparations$/,
    shows: { role: 'button', name: 'Add preparation method' },
    back: 'button',
  },
  {
    entry: /^Grinders/,
    url: /\/home\/profile\/mills$/,
    shows: { role: 'button', name: 'Add grinder' },
    back: 'button',
  },
  {
    entry: /^Water/,
    url: /\/water-section\/water$/,
    shows: { role: 'button', name: 'Add water recipe' },
    back: 'history',
  },
  {
    entry: /^Statistics/,
    url: /\/statistic$/,
    shows: { role: 'tab', name: 'General' },
    back: 'history',
  },
  {
    entry: /^Settings/,
    url: /\/settings$/,
    shows: { role: 'button', name: /^Language Settings/ },
    back: 'history',
  },
] as const) {
  test(`the entry ${String(entry)} opens its page and leads back`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await openProfile(page);
    if (String(entry).includes('Water')) {
      await switchOnWater(page);
    }

    await page.getByRole('link', { name: entry }).click();
    await expect(page).toHaveURL(url);
    await expect(
      page.getByRole(shows.role, { name: shows.name }),
    ).toBeVisible();
    if (back === 'button') {
      await page.getByRole('button', { name: 'back' }).click();
    } else {
      await page.goBack();
    }
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expect(page.getByRole('link', { name: entry })).toBeVisible();
  });
}

for (const theme of ['light', 'dark'] as const) {
  test(`the groups sit on the card surface of the ${theme} theme`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await openProfile(page);
    await setTheme(page, theme);

    const colors = await page.evaluate(() => {
      const resolve = (value: string): string => {
        const probe = document.createElement('div');
        probe.style.color = value;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const tokens = getComputedStyle(document.documentElement);
      const card = document.querySelector('app-profile .group-card')!;
      const title = document.querySelector('app-profile .group-title')!;
      return {
        card: getComputedStyle(card).backgroundColor,
        cardToken: resolve(tokens.getPropertyValue('--bq-surface-card').trim()),
        title: getComputedStyle(title).color,
        titleToken: resolve(
          tokens.getPropertyValue('--bq-text-primary').trim(),
        ),
      };
    });
    expect(colors.card).toBe(colors.cardToken);
    expect(colors.title).toBe(colors.titleToken);
  });
}

test('no entry is cut off at 200 % text size', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);
  await switchOnWater(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  await expect(entries(page)).toHaveCount(ENTRY_NAMES.length + 1);
  const viewport = page.viewportSize()!;
  for (const link of await entries(page).all()) {
    await link.scrollIntoViewIfNeeded();
    const problems = await link.evaluate((element, width) => {
      const root = element.getRootNode();
      const item = root instanceof ShadowRoot ? root.host : element;
      const found: string[] = [];
      const box = item.getBoundingClientRect();
      if (box.left < 0 || box.right > width) {
        found.push(`item outside the screen (${box.left}–${box.right})`);
      }
      const label = item.querySelector('ion-label')!;
      for (const part of [label, ...label.querySelectorAll('p')]) {
        if (
          part.scrollWidth > part.clientWidth + 1 ||
          part.scrollHeight > part.clientHeight + 1
        ) {
          found.push(`"${part.textContent.trim()}" is clipped`);
        }
      }
      return found;
    }, viewport.width);
    expect(problems).toEqual([]);
  }
});
