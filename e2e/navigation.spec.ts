import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * The tab bar holds Home, Brews, Beans and Profile. Preparation methods,
 * grinders, water, statistics and settings are one step away on the profile
 * page, and the former tab links still open their sections.
 */

const TAB_NAMES = ['Home', 'Brews', 'Beans', 'Profile'] as const;

function tabBar(page: Page) {
  // Lists also use tablists (segments), so pick the one holding the tabs.
  return page.getByRole('tablist').filter({
    has: page.getByRole('tab', { name: 'Home', exact: true }),
  });
}

async function openProfile(page: Page): Promise<void> {
  const profile = tabBar(page).getByRole('tab', { name: 'Profile' });
  await profile.click();
  await expect(profile).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function expectProfileTabSelected(page: Page): Promise<void> {
  await expect(
    tabBar(page).getByRole('tab', { name: 'Profile' }),
  ).toHaveAttribute('aria-selected', 'true');
}

test('the tab bar has the four main sections', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);

  const tabs = tabBar(page).getByRole('tab');
  await expect(tabs).toHaveCount(TAB_NAMES.length);
  for (const [index, name] of TAB_NAMES.entries()) {
    await expect(tabs.nth(index)).toHaveAccessibleName(new RegExp(`^${name}`));
  }
});

test('preparation methods and grinders open from the profile and lead back', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openProfile(page);
  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await expect(page).toHaveURL(/\/home\/profile\/preparations$/);
  await expect(
    page.getByRole('button', { name: 'Add preparation method' }),
  ).toBeVisible();
  // The sections belong to the profile, so its tab stays selected.
  await expectProfileTabSelected(page);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);

  await page.getByRole('link', { name: 'Grinders' }).click();
  await expect(page).toHaveURL(/\/home\/profile\/mills$/);
  await expect(page.getByRole('button', { name: 'Add grinder' })).toBeVisible();
  await expectProfileTabSelected(page);
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
  await expect(page.getByRole('link', { name: 'Grinders' })).toBeVisible();
});

test('statistics and settings open from the profile and lead back', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openProfile(page);
  await page.getByRole('link', { name: 'Statistics' }).click();
  await expect(page).toHaveURL(/\/statistic$/);
  await expect(page.getByRole('tab', { name: 'General' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(
    page.getByRole('button', { name: /^Language Settings/ }),
  ).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
  await expectProfileTabSelected(page);
});

test('water is listed in the profile once the section is switched on', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openProfile(page);
  await expect(page.getByRole('link', { name: 'Water' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Settings' }).click();
  const water = page.getByRole('checkbox', { name: 'Activate water section' });
  await water.scrollIntoViewIfNeeded();
  await water.click();
  await expect(water).toBeChecked();
  await page.goBack();

  await expect(page).toHaveURL(/\/home\/profile$/);
  await page.getByRole('link', { name: 'Water' }).click();
  await expect(page).toHaveURL(/\/water-section\/water$/);
  await expect(
    page.getByRole('button', { name: 'Add water recipe' }),
  ).toBeVisible();
});

/**
 * Follows a link inside the running app. A cold page load always starts on the
 * configured startup view, so the URL is changed the way the router sees a
 * history step.
 */
async function followInAppLink(page: Page, url: string): Promise<void> {
  await page.evaluate((target) => {
    history.pushState(null, '', target);
    dispatchEvent(new PopStateEvent('popstate', { state: null }));
  }, url);
}

for (const { from, to, add } of [
  {
    from: '/home/preparations',
    to: '/home/profile/preparations',
    add: 'Add preparation method',
  },
  { from: '/home/mills', to: '/home/profile/mills', add: 'Add grinder' },
] as const) {
  test(`the former tab link ${from} still opens its section`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);

    await followInAppLink(page, from);
    await expect(page).toHaveURL(new RegExp(`${to}$`));
    await expect(page.getByRole('button', { name: add })).toBeVisible();
    await expectProfileTabSelected(page);

    // Opened from elsewhere, back still leads to the profile.
    await page.getByRole('button', { name: 'back' }).click();
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expect(
      page.getByRole('link', { name: /^Preparation methods/ }),
    ).toBeVisible();
  });
}

test('the brewing parameters page still links to the preparation methods', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByRole('button', { name: 'menu' }).click();
  await page.getByRole('link', { name: 'Brewing Parameters' }).click();
  await page
    .getByRole('link', { name: 'Navigate to preparation methods' })
    .click();

  await expect(page).toHaveURL(/\/home\/profile\/preparations$/);
  await expect(
    page.getByRole('button', { name: 'Add preparation method' }),
  ).toBeVisible();
  await expectProfileTabSelected(page);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
});

test('tabs and profile entries use the glossary terms in German', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openProfile(page);
  await page.getByRole('link', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);

  const tabs = tabBar(page).getByRole('tab');
  for (const [index, name] of [
    'Home',
    'Brühungen',
    'Bohnen',
    'Profil',
  ].entries()) {
    await expect(tabs.nth(index)).toHaveAccessibleName(new RegExp(`^${name}`));
  }
  for (const name of [
    'Zubereitungsmethoden',
    'Mühlen',
    'Statistiken',
    'Einstellungen',
  ]) {
    await expect(
      page.getByRole('link', { name: new RegExp(`^${name}`) }),
    ).toBeVisible();
  }
});
