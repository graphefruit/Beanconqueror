import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { showTab } from './support/beans';
import { tabKey } from './support/keyboard';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { startsWith, text, type Language } from './support/texts';

/**
 * Tabs, focus and names for screen reader and keyboard users, in English and
 * German: segments are tabs with a named panel and their count in words, the
 * tab bars are reachable and say which tab is selected, focus lands on the
 * title of a new screen and back on the control that led away, dialogs are
 * named and modal, the buttons of a list entry name the entry, and the
 * statistics work by keyboard.
 */

type Texts = (key: string, params?: Record<string, string>) => string;

type DataSet = ReturnType<typeof generateDataSet>;

async function start(
  page: Page,
  language: Language,
  adjust: (data: DataSet) => void = () => undefined,
): Promise<void> {
  const data = generateDataSet({
    brews: 20,
    beans: 6,
    seed: 3,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].language = language;
  adjust(data);
  const graphs = ['Blooming', 'Turbo'].map((name, index) => ({
    name,
    note: '',
    flow_profile: '',
    finished: false,
    config: { uuid: `graph-${index}`, unix_timestamp: 1_761_000_000 + index },
  }));
  await seedDatabase(page, { ...data, GRAPH: graphs });
  await page.goto('/');
  await expect(page).toHaveURL(/\/home\/dashboard$/);
  await expect(page.locator('html')).toHaveAttribute('lang', language);
}

/** Shows a screen the way the router does, without a reload. */
async function show(page: Page, route: string): Promise<void> {
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await expect(page).toHaveURL(new RegExp(`${route}$`));
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** "Available, 6 in total" or "Available, 2 of 6 shown", any numbers. */
function countedTab(t: Texts, labelKey: string): RegExp {
  const words = (key: string) =>
    escape(t(key, { total: '#', shown: '#' })).replace(/#/g, '\\d+');
  return new RegExp(
    `^${escape(t(labelKey))}, (${words('A11Y.COUNT_TOTAL')}|${words('A11Y.COUNT_SHOWN')})$`,
  );
}

/** The modal on show, whose content is slotted into its dialog. */
function openModal(page: Page): Locator {
  return page.locator('ion-modal:not(.overlay-hidden)');
}

/** The tabs of `tabList` have these names, in this order. */
async function expectTabs(tabList: Locator, names: string[]): Promise<void> {
  const tabs = tabList.getByRole('tab');
  await expect(tabs).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(tabs.nth(index)).toHaveAccessibleName(name);
  }
}

/**
 * The selected tab of `screen` names its one panel, which holds the list
 * below the tabs but not the tabs themselves.
 */
async function expectPanelOfSelectedTab(screen: Locator): Promise<void> {
  const tab = visible(screen.getByRole('tab', { selected: true }));
  await expect(tab).toHaveCount(1);
  const name = /^- tab "(.+)"/.exec(await tab.ariaSnapshot())?.[1];
  expect(name).toBeTruthy();
  const panel = visible(screen.getByRole('tabpanel'));
  await expect(panel).toHaveCount(1);
  await expect(panel).toHaveAccessibleName(name!);
  await expect(panel.getByRole('list')).toHaveCount(1);
  await expect(panel.getByRole('tab')).toHaveCount(0);
}

interface AngularDevHooks {
  getComponent(element: Element): unknown;
}

function tabBar(page: Page): Locator {
  return visible(page.getByRole('navigation')).getByRole('tablist');
}

/**
 * Drags a finger from the left edge to `farthest` and back to the edge before
 * letting go: Ionic starts a swipe back and then cancels it.
 */
async function swipeBackAndCancel(page: Page, farthest: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    x: number,
  ): Promise<unknown> =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y: 400 }],
    });
  await touch('touchStart', 4);
  for (let x = 4; x <= farthest; x += 8) {
    await touch('touchMove', x);
  }
  for (let x = farthest; x >= 4; x -= 4) {
    await touch('touchMove', x);
  }
  await touch('touchEnd', 4);
  await cdp.detach();
}

for (const language of ['en', 'de'] as const) {
  test.describe(language, () => {
    const t: Texts = (key, params) => text(language, key, params);

    test('segments are tabs with a named panel and their count in words', async ({
      page,
    }) => {
      await start(page, language);

      for (const [tab, label] of [
        ['NAV_BEANS', 'PAGE_BEANS_LIST_OBTAINABLE'],
        ['NAV_BREWS', 'CURRENT'],
      ]) {
        await tabBar(page)
          .getByRole('tab', { name: t(tab) })
          .click();
        const tabs = visible(page.getByRole('banner').getByRole('tab'));
        await expect(tabs.first()).toHaveAccessibleName(countedTab(t, label));
        for (const each of await tabs.all()) {
          await expect(each).not.toHaveAccessibleName(/[(/)]/);
        }
      }

      await show(page, '/home/profile/settings');
      const settings = page.locator('settings');
      const general = settings.getByRole('tab', {
        name: t('PAGE_SETTINGS_TAB_GENERAL'),
      });
      const scale = settings.getByRole('tab', {
        name: t('PAGE_SETTINGS_TAB_BLUETOOTH_SCALE'),
      });
      await expect(
        settings.getByRole('tabpanel', {
          name: t('PAGE_SETTINGS_TAB_GENERAL'),
        }),
      ).toBeVisible();

      // Ionic: arrow keys move focus, Enter selects.
      await general.focus();
      await page.keyboard.press('ArrowRight');
      await expect(scale).toBeFocused();
      await expect(general).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('Enter');
      await expect(scale).toHaveAttribute('aria-selected', 'true');
      await expect(settings.getByRole('tabpanel')).toHaveCount(1);
      await expect(settings.getByRole('tabpanel')).toHaveAccessibleName(
        t('PAGE_SETTINGS_TAB_BLUETOOTH_SCALE'),
      );
      // The selected tab points to its panel.
      expect(
        await scale.evaluate(
          (tab) => tab.ariaControlsElements?.[0]?.getAttribute('role') ?? null,
        ),
      ).toBe('tabpanel');

      await show(page, '/roasting-section/roasting-machine');
      await expect(
        page
          .locator('app-roasting-machine')
          .getByRole('tabpanel', { name: t('CURRENT') }),
      ).toBeVisible();

      await show(page, '/home/brews');
      await visible(page.getByRole('button', { name: t('ADD_BREW') })).click();
      for (const [field, title] of [
        ['BREW_DATA_MILL', 'CHOOSE_MILL'],
        ['BREW_DATA_PREPARATION_METHOD', 'CHOOSE_PREPARATION'],
      ]) {
        await visible(page.locator('ion-select').filter({ hasText: t(field) }))
          .first()
          .click();
        const chooser = openModal(page).last();
        await expect(
          chooser.getByRole('heading', { level: 1, name: t(title) }),
        ).toBeVisible();
        await expect(
          chooser.getByRole('tabpanel', { name: t('CURRENT') }),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(
          chooser.getByRole('heading', { level: 1, name: t(title) }),
        ).toBeHidden();
      }
    });

    test('the lists below segments are the panel of the selected tab', async ({
      page,
    }) => {
      await start(page, language);
      for (const [route, screen] of [
        ['/home/beans', 'beans'],
        ['/home/brews', 'brew'],
        ['/home/profile/preparations', 'preparation'],
        ['/home/profile/mills', 'mill'],
        ['/home/profile/water', 'app-water'],
        ['/home/profile/graph', 'app-graph'],
        ['/roasting-section/dashboard', 'app-green-beans'],
      ] as const) {
        await show(page, route);
        await expectPanelOfSelectedTab(page.locator(screen));
      }

      await show(page, '/home/brews');
      await visible(page.getByRole('button', { name: t('ADD_BREW') })).click();
      await visible(
        page
          .locator('ion-select')
          .filter({ hasText: t('BREW_DATA_BEAN_TYPE') }),
      )
        .first()
        .click();
      const beans = openModal(page).last();
      await expect(
        beans.getByRole('heading', { level: 1, name: t('CHOOSE_BEAN') }),
      ).toBeVisible();
      await expectPanelOfSelectedTab(beans);
      await page.keyboard.press('Escape');
      await expect(
        beans.getByRole('heading', { level: 1, name: t('CHOOSE_BEAN') }),
      ).toBeHidden();

      // The chooser of a reference graph is offered only with a connected
      // device or a recorded graph: opened through Angular's development
      // hooks.
      const graph = openModal(page).last().locator('brew-brewing-graph');
      await expect(graph).toBeAttached();
      await graph.evaluate((element) => {
        const ng = (window as unknown as { ng: AngularDevHooks }).ng;
        const component = ng.getComponent(element) as {
          chooseGraphToSetAsReference(): Promise<void>;
        };
        void component.chooseGraphToSetAsReference();
      });
      const reference = openModal(page).last();
      await expect(
        reference.getByRole('heading', {
          level: 1,
          name: t('CHOOSE_REFERENCE_GRAPH'),
        }),
      ).toBeVisible();
      await expect(
        reference.getByRole('tab', { name: t('GRAPHS'), selected: true }),
      ).toBeVisible();
      await expectPanelOfSelectedTab(reference);
      await showTab(reference.getByRole('tab', { name: t('BREWS_ACTIVE') }));
      await expect(
        reference.getByRole('tabpanel', { name: t('BREWS_ACTIVE') }),
      ).toBeVisible();
      await expectPanelOfSelectedTab(reference);
    });

    test('the tab bars name and select their tabs and are reachable by keyboard', async ({
      page,
    }) => {
      await start(page, language);
      const home = tabBar(page);
      await expectTabs(home, [
        t('NAV_HOME'),
        t('NAV_BREWS'),
        t('NAV_BEANS'),
        t('NAV_PROFILE'),
      ]);
      await expect(home.locator('[aria-selected="true"]')).toHaveCount(1);
      const beans = home.getByRole('tab', { name: t('NAV_BEANS') });
      await beans.focus();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/home\/beans$/);
      await expect(beans).toHaveAttribute('aria-selected', 'true');
      // The tab keeps focus, as in the tabs pattern.
      await expect(beans).toBeFocused();

      await show(page, '/baristamode/barista');
      const barista = tabBar(page);
      await expectTabs(barista, [
        t('NAV_BARISTAMODE_SECTION'),
        t('NAV_BREWS'),
        t('NAV_STATISTICS'),
      ]);
      const statistics = barista.getByRole('tab', {
        name: t('NAV_STATISTICS'),
      });
      await statistics.focus();
      await expect(statistics).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/baristamode\/statistics$/);
      await expect(statistics).toHaveAttribute('aria-selected', 'true');
    });

    test('focus lands on the title of a new screen and back where it left', async ({
      page,
    }) => {
      await start(page, language);
      await tabBar(page)
        .getByRole('tab', { name: t('NAV_PROFILE') })
        .click();
      const link = page
        .locator('app-profile')
        .getByRole('link', { name: startsWith(t('NAV_SETTINGS')) });
      await link.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('heading', { level: 1, name: t('NAV_SETTINGS') }),
      ).toBeFocused();

      await page.keyboard.press(tabKey(page, true));
      await expect(
        visible(page.getByRole('button', { name: t('BACK'), exact: true })),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/home\/profile$/);
      await expect(link).toBeFocused();
    });

    test('focus stays where it was when a swipe back is let go of early', async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'Drags the finger through Chromium.',
      );
      await start(page, language);
      await tabBar(page)
        .getByRole('tab', { name: t('NAV_PROFILE') })
        .click();
      const link = page
        .locator('app-profile')
        .getByRole('link', { name: startsWith(t('NAV_SETTINGS')) });
      await link.focus();
      await page.keyboard.press('Enter');
      const title = page.getByRole('heading', {
        level: 1,
        name: t('NAV_SETTINGS'),
      });
      await expect(title).toBeFocused();

      await expect(page.locator('app-profile')).toBeHidden();

      // The profile comes in while the finger is down and takes focus then.
      await page.evaluate(() => {
        document.addEventListener(
          'ionViewWillEnter',
          () =>
            setTimeout(() => {
              document.body.dataset['focusComingIn'] =
                document.activeElement?.tagName ?? '';
            }),
          { capture: true, once: true },
        );
      });
      await swipeBackAndCancel(page, 120);
      await expect(page.locator('body')).toHaveAttribute(
        'data-focus-coming-in',
        'ION-ITEM',
      );

      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.locator('app-profile')).toBeHidden();
      await expect(title).toBeFocused();
    });

    test('focus goes back to the control that opened a dialog, or to the entry at its place once it is gone', async ({
      page,
    }) => {
      await start(page, language);
      await tabBar(page)
        .getByRole('tab', { name: t('NAV_BREWS') })
        .click();
      await expect(page).toHaveURL(/\/home\/brews$/);
      const options = page
        .locator('brew')
        .getByRole('button', {
          name: startsWith(t('A11Y.BREW_OPTIONS_FOR', { date: '' })),
        })
        .first();
      await options.focus();
      await page.keyboard.press('Enter');
      await expect(visible(page.getByRole('dialog'))).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(options).toBeFocused();

      // A tap in WebKit, or VoiceOver activating the button, clicks without
      // focusing; Ionic then has no control to give focus back to.
      await options.blur();
      await options.dispatchEvent('click');
      await page
        .getByRole('button', { name: t('DELETE'), exact: true })
        .dispatchEvent('click');
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: t('NO'), exact: true })
        .dispatchEvent('click');
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(options).toBeFocused();

      // Once it is gone with its brew, the brew at its place takes the focus.
      const next = await page
        .locator('brew brew-information')
        .nth(1)
        .getAttribute('id');
      await options.click();
      await page
        .getByRole('button', { name: t('DELETE'), exact: true })
        .click();
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: t('YES'), exact: true })
        .click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.activeElement?.closest('brew-information')?.id,
          ),
        )
        .toBe(next);
    });

    test('focus stays where it is after a dialog the app opened without a tap', async ({
      page,
    }) => {
      await page.clock.install();
      await start(page, language);
      await tabBar(page)
        .getByRole('tab', { name: t('NAV_BREWS') })
        .click();
      await expect(page).toHaveURL(/\/home\/brews$/);
      const options = page
        .locator('brew')
        .getByRole('button', {
          name: startsWith(t('A11Y.BREW_OPTIONS_FOR', { date: '' })),
        })
        .first();
      // The control was used a while ago; the screen reader has moved on.
      await options.focus();
      await options.blur();
      await page.clock.fastForward(5000);

      // E.g. a wait or a Bluetooth message, which nothing on screen opened.
      await page.evaluate(async () => {
        const alert = document.createElement('ion-alert') as HTMLElement & {
          header: string;
          buttons: string[];
          present(): Promise<void>;
        };
        alert.header = 'Scale';
        alert.buttons = ['OK'];
        document.querySelector('ion-app')?.append(alert);
        await alert.present();
        document.addEventListener(
          'ionAlertDidDismiss',
          () =>
            setTimeout(() => {
              document.body.dataset['focusAfterDialog'] =
                document.activeElement?.tagName ?? '';
            }),
          { capture: true, once: true },
        );
      });
      await page
        .getByRole('alertdialog')
        .getByRole('button', { name: 'OK', exact: true })
        .dispatchEvent('click');

      await expect(page.locator('body')).toHaveAttribute(
        'data-focus-after-dialog',
        'BODY',
      );
      await expect(options).not.toBeFocused();
    });

    test('dialogs are modal and named after their title or the entry', async ({
      page,
    }) => {
      await start(page, language);
      await tabBar(page)
        .getByRole('tab', { name: t('NAV_BEANS') })
        .click();
      await expect(page).toHaveURL(/\/home\/beans$/);
      const options = page
        .locator('beans')
        .getByRole('button', {
          name: startsWith(t('A11Y.OPTIONS_FOR', { name: '' })),
        })
        .first();
      const optionsName = (await options.getAttribute('aria-label')) ?? '';
      await options.click();
      const sheet = page.getByRole('dialog', { name: optionsName });
      await expect(sheet).toBeVisible();
      await expect(sheet).toHaveAttribute('aria-modal', 'true');
      // The content is slotted into the dialog: it is found from the host.
      const sheetContent = openModal(page);
      await expect(sheetContent.getByRole('button').first()).toBeVisible();
      await expect(sheetContent.getByRole('banner')).toHaveCount(0);
      await expect(sheetContent.getByRole('img')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await visible(
        page.getByRole('button', { name: t('ADD_BEAN'), exact: true }),
      ).click();
      const dialog = page.getByRole('dialog', { name: t('ADD_BEAN') });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      // The form's segments have their panel inside the dialog, too.
      await expect(
        openModal(page).getByRole('tabpanel', {
          name: t('BEAN_TAB_GENERAL_INFORMATION'),
        }),
      ).toBeVisible();
    });

    test('the statistics work by keyboard', async ({ page }) => {
      await start(page, language);
      await show(page, '/home/profile/statistic');
      const statistic = page.locator('statistic');
      const brews = statistic.getByRole('tab', {
        name: t('STATISTIC_TAB_BREWS'),
        exact: true,
      });
      await brews.focus();
      await page.keyboard.press('Enter');
      await expect(brews).toHaveAttribute('aria-selected', 'true');
      await expect(
        statistic.getByRole('tabpanel', { name: t('STATISTIC_TAB_BREWS') }),
      ).toBeVisible();
      // A chart is drawn once it is wider than an empty canvas.
      await expect
        .poll(() =>
          statistic
            .locator('canvas')
            .first()
            .evaluate((canvas: HTMLCanvasElement) => canvas.width),
        )
        .toBeGreaterThan(300);

      const thisMonth = statistic.getByRole('tab', {
        name: t('STATISTIC_RANGE_THIS_MONTH'),
      });
      await thisMonth.focus();
      await page.keyboard.press('Enter');
      await expect(thisMonth).toHaveAttribute('aria-selected', 'true');
    });
  });
}
