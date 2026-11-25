import type { AppPlugin } from '@capacitor/app';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { pressHardwareBack } from './support/back-button';
import { completeFirstRun } from './support/first-run';
import type { NativeBoundary } from './support/native';
import { openFromProfile } from './support/profile';
import { mainTabName } from './support/texts';

/**
 * The tab bar holds Home, Brews, Beans and Profile. Preparation methods,
 * grinders, water, statistics and settings are one step away on the profile
 * page, and the former tab links still open their sections.
 */

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

/** Switches the app to German in the settings and returns to the profile. */
async function switchToGermanFromProfile(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Settings/ }).click();
  await page.getByRole('button', { name: /^Language Settings/ }).press('Enter');
  await page.getByRole('radio', { name: 'German' }).click();
  await page.getByRole('button', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function expectProfileTabSelected(page: Page): Promise<void> {
  await expect(
    tabBar(page).getByRole('tab', { name: 'Profile' }),
  ).toHaveAttribute('aria-selected', 'true');
}

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

/** Switches optional sections on in the settings and returns to the profile. */
async function switchOnSections(page: Page, toggles: string[]): Promise<void> {
  await page.getByRole('link', { name: /^More sections/ }).click();
  for (const name of toggles) {
    const toggle = page.getByRole('switch', { name });
    await toggle.click();
    await expect(toggle).toBeChecked();
  }
  await page.goBack();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

/**
 * Every page of the former side menu: the hub entry that opens it (the second
 * tap after the Profile tab), the page and its screen title. Optional sections
 * first have to be switched on. Calculations and roasting still switch between
 * their two pages with a tab bar of their own, so they open without the app's.
 */
const FORMER_MENU_PAGES = [
  {
    entry: 'Statistics',
    url: /\/home\/profile\/statistic$/,
    title: 'Statistics',
  },
  {
    entry: 'Brewing Parameters',
    url: /\/home\/profile\/brew-parameter$/,
    title: 'Brewing Parameters',
  },
  {
    entry: 'Bean parameters',
    url: /\/home\/profile\/bean-parameter$/,
    title: 'Bean parameters',
  },
  {
    entry: 'Calculations',
    url: /\/helper\/brew-ratio$/,
    title: 'Brew Ratio',
    ownTabBar: true,
  },
  { entry: 'Settings', url: /\/home\/profile\/settings$/, title: 'Settings' },
  {
    entry: 'Info & support',
    url: /\/home\/profile\/info$/,
    title: 'About Beanconqueror',
  },
  {
    entry: 'Water',
    url: /\/home\/profile\/water$/,
    title: 'Water',
    switchOn: 'Water',
  },
  {
    entry: 'Graphs',
    url: /\/home\/profile\/graph$/,
    title: 'Graphs',
    switchOn: 'Graphs',
  },
  {
    entry: 'Bean Roasting',
    url: /\/roasting-section\/dashboard$/,
    title: 'Green Beans',
    switchOn: 'Bean Roasting',
    ownTabBar: true,
  },
] as const;

for (const target of FORMER_MENU_PAGES) {
  test(`${target.entry} opens in two taps from the profile and leads back`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    if ('switchOn' in target) {
      await openProfile(page);
      await switchOnSections(page, [target.switchOn]);
      await page.getByRole('tab', { name: 'Home', exact: true }).click();
    }

    await openFromProfile(page, target.entry);
    await expect(page).toHaveURL(target.url);
    const banner = page.getByRole('banner').filter({ hasText: target.title });
    await expect(banner.getByText(target.title, { exact: true })).toBeVisible();
    if (!('ownTabBar' in target)) {
      await expect(tabBar(page)).toBeVisible();
      await expectProfileTabSelected(page);
    }

    // The arrow in the header leads back to the profile.
    await banner.getByRole('button', { name: 'back' }).click();
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expectProfileTabSelected(page);
  });
}

test('water is listed in the profile once the section is switched on', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openProfile(page);
  await expect(page.getByRole('link', { name: /^Water/ })).toHaveCount(0);

  await page.getByRole('link', { name: /^More sections/ }).click();
  const water = page.getByRole('switch', { name: 'Water' });
  await water.click();
  await expect(water).toBeChecked();
  await page.goBack();

  await expect(page).toHaveURL(/\/home\/profile$/);
  await page.getByRole('link', { name: /^Water/ }).click();
  await expect(page).toHaveURL(/\/home\/profile\/water$/);
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

for (const { from, to, title } of [
  { from: '/statistic', to: '/home/profile/statistic', title: 'Statistics' },
  {
    from: '/brew-parameter',
    to: '/home/profile/brew-parameter',
    title: 'Brewing Parameters',
  },
  {
    from: '/brew-parameter/manage',
    to: '/home/profile/brew-parameter/manage',
    title: 'Manage parameters',
  },
  {
    from: '/bean-parameter',
    to: '/home/profile/bean-parameter',
    title: 'Bean parameters',
  },
  { from: '/settings', to: '/home/profile/settings', title: 'Settings' },
  { from: '/info', to: '/home/profile/info', title: 'About Beanconqueror' },
  { from: '/info/about', to: '/home/profile/info/about', title: 'About us' },
  { from: '/water-section', to: '/home/profile/water', title: 'Water' },
  { from: '/water-section/water', to: '/home/profile/water', title: 'Water' },
  { from: '/graph-section', to: '/home/profile/graph', title: 'Graphs' },
  { from: '/graph-section/graph', to: '/home/profile/graph', title: 'Graphs' },
] as const) {
  test(`the former menu link ${from} opens its page in the profile tab`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);

    await followInAppLink(page, from);
    await expect(page).toHaveURL(new RegExp(`${to}$`));
    const banner = page.getByRole('banner').filter({ hasText: title });
    await expect(banner.getByText(title, { exact: true })).toBeVisible();
    await expect(tabBar(page)).toBeVisible();
    await expectProfileTabSelected(page);
  });
}

test('the statistics card on Home opens the statistics in the Home tab', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await page.getByText('without coffee').click();
  await expect(page).toHaveURL(/\/home\/dashboard\/statistic$/);
  const homeTab = tabBar(page).getByRole('tab', { name: 'Home', exact: true });
  await expect(homeTab).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('banner')
    .filter({ hasText: 'Statistics' })
    .getByRole('button', { name: 'back' })
    .click();
  await expect(page).toHaveURL(/\/home\/dashboard$/);
});

test('the brewing parameters page still links to the preparation methods', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  await openFromProfile(page, 'Brewing Parameters');
  await page
    .getByRole('link', { name: 'Navigate to preparation methods' })
    .click();

  await expect(page).toHaveURL(/\/home\/profile\/preparations$/);
  await expect(
    page.getByRole('button', { name: 'Add preparation method' }),
  ).toBeVisible();
  await expectProfileTabSelected(page);
  await page
    .getByRole('banner')
    .filter({ hasText: 'Methods' })
    .getByRole('button', { name: 'back' })
    .click();
  await expect(page).toHaveURL(/\/home\/profile$/);
});

/** Whether Ionic ellipsizes the screen title shown in the header. */
async function screenTitleIsCut(page: Page, title: string): Promise<boolean> {
  const span = page.getByRole('banner').getByText(title, { exact: true });
  await expect(span).toBeVisible();
  return span.evaluate((element) => {
    const inner = element
      .closest('ion-title')!
      .shadowRoot!.querySelector('.toolbar-title')!;
    return inner.scrollWidth > inner.clientWidth;
  });
}

for (const language of [
  {
    name: 'English',
    preparations: 'Preparation methods',
    preparationsTitle: 'Methods',
    grinders: 'Grinders',
    back: 'Back',
  },
  {
    name: 'German',
    preparations: 'Zubereitungsmethoden',
    preparationsTitle: 'Methoden',
    grinders: 'Mühlen',
    back: 'Zurück',
  },
] as const) {
  test(`the preparation and grinder titles fit the header in ${language.name}`, async ({
    page,
  }) => {
    await page.goto('/');
    await completeFirstRun(page);
    await openProfile(page);
    if (language.name === 'German') {
      await switchToGermanFromProfile(page);
    }

    // The profile entry may use the long term; the screen title must stay whole.
    for (const textSize of ['100%', '200%']) {
      await page.evaluate((size) => {
        document.documentElement.style.fontSize = size;
      }, textSize);
      for (const [entry, title] of [
        [language.preparations, language.preparationsTitle],
        [language.grinders, language.grinders],
      ]) {
        await page.getByRole('link', { name: new RegExp(`^${entry}`) }).click();
        expect(
          await screenTitleIsCut(page, title),
          `${title} is not ellipsized at ${textSize}`,
        ).toBe(false);
        await page
          .getByRole('button', { name: language.back, exact: true })
          .click();
        await expect(page).toHaveURL(/\/home\/profile$/);
      }
    }
  });
}

test('long German profile entries break at a syllable at 200 % text size', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);
  await switchToGermanFromProfile(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });

  const entry = page.getByRole('link', { name: /^Zubereitungsmethoden/ });
  await expect(entry).toBeVisible();
  // The link role sits on Ionic's inner anchor; the label is slotted into the
  // item, so it is read from the host.
  const layout = await entry.evaluate((link) => {
    const root = link.getRootNode();
    const item = root instanceof ShadowRoot ? root.host : link;
    const label = item.querySelector('ion-label')!;
    const text = label.firstChild!;
    const lines: string[] = [];
    let top: number | undefined;
    for (let index = 0; index < text.textContent!.length; index++) {
      const range = document.createRange();
      range.setStart(text, index);
      range.setEnd(text, index + 1);
      const glyph = [...range.getClientRects()].find((rect) => rect.width > 0);
      if (!glyph) {
        continue;
      }
      if (top === undefined || Math.abs(glyph.top - top) > 2) {
        lines.push('');
        top = glyph.top;
      }
      lines[lines.length - 1] += text.textContent![index];
    }
    return { lines, hyphens: getComputedStyle(label).hyphens };
  });

  // The compound is wider than the screen at this size, so it must break.
  expect(layout.lines.length).toBeGreaterThan(1);
  expect(layout.hyphens).toBe('auto');
  for (const line of layout.lines) {
    expect(
      line.trim().length,
      `"${line}" is not a stray letter of the word`,
    ).toBeGreaterThan(1);
  }
});

/**
 * The dot on the profile tab. It is decorative and slotted next to the tab's
 * shadow link, so it is found by its element instead of inside the tab role.
 */
function profileDot(page: Page) {
  return page.locator('ion-tab-button[tab="profile"] > ion-badge');
}

async function addGrinderFromProfile(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Grinders/ }).click();
  await page.getByRole('button', { name: 'Add grinder' }).click();
  await page.getByRole('textbox', { name: /^Name/ }).fill('Comandante C40');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

async function addPreparationFromProfile(page: Page): Promise<void> {
  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await page.getByRole('button', { name: 'Add preparation method' }).click();
  await page.getByText('V60', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);
}

test('the profile marks a missing grinder and names it', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);

  await expect(profileDot(page)).toBeVisible();
  await openProfile(page);
  await expect(
    page.getByRole('link', { name: 'Preparation methods None added yet' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Grinders None added yet' }),
  ).toBeVisible();

  await addPreparationFromProfile(page);
  await expect(
    page.getByRole('link', {
      name: 'Preparation methods 1 method',
      exact: true,
    }),
  ).toBeVisible();
  // Only the grinder is missing now, and the tab still says so.
  await expect(profileDot(page)).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Grinders None added yet' }),
  ).toBeVisible();

  await addGrinderFromProfile(page);
  await expect(
    page.getByRole('link', { name: 'Grinders 1 grinder', exact: true }),
  ).toBeVisible();
  await expect(profileDot(page)).toHaveCount(0);
});

test.describe('the Android back key', () => {
  test.beforeEach(async ({ page, native }) => {
    // On the profile itself the key leaves the app, as on every tab.
    await native.mockCapacitor<AppPlugin>('App', {
      minimizeApp: () => undefined,
    });
    await page.goto('/');
    await completeFirstRun(page);
    await openProfile(page);
  });

  async function minimizeCalls(native: NativeBoundary) {
    return (await native.calls()).filter(
      (call) => call.plugin === 'App' && call.method === 'minimizeApp',
    );
  }

  test('returns from preparation methods and grinders to the profile', async ({
    page,
    native,
  }) => {
    await page.getByRole('link', { name: /^Preparation methods/ }).click();
    await expect(page).toHaveURL(/\/home\/profile\/preparations$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expectProfileTabSelected(page);

    await page.getByRole('link', { name: /^Grinders/ }).click();
    await expect(page).toHaveURL(/\/home\/profile\/mills$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expect(page.getByRole('link', { name: /^Grinders/ })).toBeVisible();
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('returns to the profile from a former tab link', async ({
    page,
    native,
  }) => {
    await page.getByRole('tab', { name: 'Home' }).click();
    await followInAppLink(page, '/home/mills');
    await expect(page).toHaveURL(/\/home\/profile\/mills$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile$/);
    await expectProfileTabSelected(page);
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('returns from statistics to the profile', async ({ page, native }) => {
    await page.getByRole('link', { name: /^Statistics/ }).click();
    await expect(page).toHaveURL(/\/home\/profile\/statistic$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile$/);
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('returns one page at a time from the parameter pages', async ({
    page,
    native,
  }) => {
    await page.getByRole('link', { name: /^Brewing Parameters/ }).click();
    await page.getByText('Manage parameters', { exact: true }).click();
    await expect(page).toHaveURL(/\/home\/profile\/brew-parameter\/manage$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile\/brew-parameter$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/profile$/);
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('returns from the gear on Beans to the bean list', async ({
    page,
    native,
  }) => {
    await page.getByRole('tab', { name: mainTabName('Beans') }).click();
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Bean parameters', exact: true })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/home\/beans\/bean-parameter$/);
    await pressHardwareBack(page);
    await expect(page).toHaveURL(/\/home\/beans$/);
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('returns from the former menu pages to the profile', async ({
    page,
    native,
  }) => {
    for (const target of FORMER_MENU_PAGES) {
      if ('switchOn' in target) {
        continue;
      }
      await openFromProfile(page, target.entry);
      await expect(page).toHaveURL(target.url);
      await pressHardwareBack(page);
      await expect(page).toHaveURL(/\/home\/profile$/);
    }
    expect(await minimizeCalls(native)).toEqual([]);
  });

  test('leaves the app from the profile itself', async ({ page, native }) => {
    await pressHardwareBack(page);
    await expect.poll(() => minimizeCalls(native)).toHaveLength(1);
    await expect(page).toHaveURL(/\/home\/profile$/);
  });
});

test('the barista mode is listed under equipment once a Sanremo YOU method exists', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openProfile(page);
  const baristaMode = page.getByRole('link', { name: /^Baristamode/ });
  await expect(baristaMode).toHaveCount(0);

  await page.getByRole('link', { name: /^Preparation methods/ }).click();
  await page.getByRole('button', { name: 'Add preparation method' }).click();
  await page.getByText('Sanremo YOU', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  // A machine method asks for its connection next; it can be set up later.
  await expect(
    page.getByRole('banner').getByText('Device connection'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'back' }).click();
  await expect(page).toHaveURL(/\/home\/profile$/);

  // The barista mode itself needs the machine, so the link is checked only.
  await expect(baristaMode).toHaveAccessibleName(
    'Baristamode Brews on the Sanremo YOU',
  );
  await expect(baristaMode).toHaveAttribute('href', '/baristamode');
});
