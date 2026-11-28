import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { axe } from './support/axe';
import { BEANS } from './support/bean-data';
import { showBeanSegment, startWithBeans } from './support/beans';
import {
  headingOutline,
  headingsInButtons,
  outlineProblems,
} from './support/headings';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { startsWith, text, type Language } from './support/texts';

/**
 * Screen reader users move through a screen from heading to heading. Every
 * screen and dialog has its title as the one level-1 heading, sections and the
 * cards of a list are level 2, and labels, values and figures are no headings.
 * Checked in English and German, by the outline and by axe.
 */

/** The app's text for a key, in the language under test. */
type Texts = (key: string, params?: Record<string, string>) => string;

/** Every screen of the app that can be reached without a device. */
const ROUTES = [
  '/home/dashboard',
  '/home/brews',
  '/home/beans',
  '/home/profile',
  '/home/profile/preparations',
  '/home/profile/mills',
  '/home/profile/water',
  '/home/profile/graph',
  '/home/profile/sections',
  '/home/profile/statistic',
  '/home/profile/brew-parameter',
  '/home/profile/brew-parameter/manage',
  '/home/profile/brew-parameter/sort',
  '/home/profile/brew-parameter/default',
  '/home/profile/brew-parameter/listview',
  '/home/profile/brew-parameter/repeat',
  '/home/profile/bean-parameter',
  '/home/profile/bean-parameter/manage',
  '/home/profile/bean-parameter/listview',
  '/home/profile/settings',
  '/home/profile/info',
  '/home/profile/info/contact',
  '/home/profile/info/about',
  '/home/profile/info/credits',
  '/home/profile/info/thanks',
  '/home/profile/info/logs',
  '/home/profile/info/licences',
  '/home/profile/info/privacy',
  '/home/profile/info/terms',
  '/home/profile/info/impressum',
  '/home/profile/info/cookie',
  '/roasting-section/dashboard',
  '/roasting-section/roasting-machine',
  '/helper/brew-ratio',
  '/helper/water-hardness',
  '/baristamode/barista',
  '/baristamode/brews',
  '/baristamode/statistics',
];

/** The card components of the lists; a card in a bean group is level 3. */
const LIST_CARDS: Record<string, string> = {
  '/home/brews': 'brew-information',
  '/home/beans': 'bean-information:not(bean-information bean-information)',
  '/home/profile/preparations': 'preparation-information-card',
  '/home/profile/mills': 'mill-information-card',
  '/home/profile/water': 'water-information-card',
  '/home/profile/graph': 'graph-information-card',
  '/home/profile/info/licences': 'licences ion-card',
  '/roasting-section/dashboard': 'green-bean-information',
  '/roasting-section/roasting-machine': 'roasting-machine-information-card',
};

async function start(page: Page, language: Language): Promise<void> {
  const data = generateDataSet({
    brews: 20,
    beans: 6,
    seed: 3,
    endDate: new Date('2026-11-01T18:00:00Z'),
  });
  data.SETTINGS[0].language = language;
  data.SETTINGS[0].welcome_page_showed = true;
  // The data set has no graphs; the list of graphs needs some.
  const graphs = ['Blooming', 'Turbo'].map((name, index) => ({
    name,
    note: '',
    flow_profile: '',
    finished: false,
    config: { uuid: `graph-${index}`, unix_timestamp: 1_761_000_000 + index },
  }));
  await seedDatabase(page, { ...data, GRAPH: graphs });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', language);
  // The start-up navigation to Home would undo an earlier one.
  await expect(page).toHaveURL(/\/home\/dashboard$/);
  await expect(
    page.getByRole('heading', { level: 1, name: text(language, 'OVERVIEW') }),
  ).toBeVisible();
}

/** Shows a screen the way the router does, without a reload. */
async function show(page: Page, route: string): Promise<void> {
  const shown = page.locator('[data-e2e-shown]');
  await page
    .getByRole('heading', { level: 1 })
    .evaluateAll((headings) =>
      headings
        .filter((heading) => heading.checkVisibility())
        .forEach((heading) => heading.setAttribute('data-e2e-shown', '')),
    );
  await page.evaluate((path) => {
    history.pushState({}, '', path);
    dispatchEvent(new PopStateEvent('popstate'));
  }, route);
  await expect(page).toHaveURL(new RegExp(`${route}$`));
  // The URL changes at once, the screen only after the router and the
  // transition; until then the checks would see the screen before.
  await expect(shown.filter({ visible: true })).toHaveCount(0);
  await shown.evaluateAll((headings) =>
    headings.forEach((heading) => heading.removeAttribute('data-e2e-shown')),
  );
}

async function expectOutline(page: Page, view: string): Promise<void> {
  await expect
    .poll(async () => outlineProblems(await headingOutline(page)), {
      message: `heading outline of ${view}`,
    })
    .toEqual([]);
  expect
    .soft(await headingsInButtons(page), `headings inside buttons on ${view}`)
    .toEqual([]);
  const results = await axe(page)
    .withRules(['page-has-heading-one', 'heading-order', 'empty-heading'])
    .analyze();
  expect
    .soft(
      results.violations.map(({ id, nodes }) => `${id} (${nodes.length})`),
      `axe heading rules on ${view}`,
    )
    .toEqual([]);
}

function visible(locator: Locator): Locator {
  return locator.filter({ visible: true });
}

async function addBy(page: Page, buttonName: string): Promise<void> {
  await visible(page.getByRole('button', { name: buttonName, exact: true }))
    .first()
    .click();
}

for (const language of ['en', 'de'] as const) {
  test.describe(language, () => {
    const t: Texts = (key, params) => text(language, key, params);

    test('every screen has its title as the one level-1 heading', async ({
      page,
    }) => {
      test.slow();
      await start(page, language);
      // Lists without entries in the data set get one through their form.
      await show(page, '/roasting-section/dashboard');
      await addBy(page, t('A11Y.ADD_GREEN_BEAN'));
      await addNamed(page, t, 'Kenya AA');
      await show(page, '/roasting-section/roasting-machine');
      await addBy(page, t('A11Y.ADD_ROASTING_MACHINE'));
      await addNamed(page, t, 'Kaffeeröster 1');

      for (const route of ROUTES) {
        await show(page, route);
        await expectOutline(page, route);
        const card = LIST_CARDS[route];
        if (card) {
          const cards = visible(page.locator(card));
          await expect(cards.first()).toBeVisible();
          // The virtual scroll may recycle a card while the loop runs.
          await expect(async () => {
            for (const each of await cards.all()) {
              await expect(
                each.getByRole('heading', { level: 2 }),
                `each card on ${route} has its title as the one level-2 heading`,
              ).toHaveCount(1, { timeout: 1000 });
            }
          }).toPass();
        }
      }
    });

    const dialogs: {
      name: string;
      route: string;
      open: (page: Page, t: Texts) => Promise<void>;
      sections?: string[];
    }[] = [
      {
        name: 'add bean',
        route: '/home/beans',
        open: (page, t) => addBy(page, t('ADD_BEAN')),
      },
      {
        name: 'bean details',
        route: '/home/beans',
        open: (page, t) =>
          details(
            page,
            startsWith(t('A11Y.OPTIONS_FOR', { name: '' })),
            t('DETAIL'),
          ),
        sections: ['BEAN_SORT_MORE_INFORMATION'],
      },
      {
        name: 'add brew',
        route: '/home/brews',
        open: (page, t) => addBy(page, t('ADD_BREW')),
      },
      {
        name: 'brew details',
        route: '/home/brews',
        open: (page, t) =>
          details(
            page,
            startsWith(t('A11Y.BREW_OPTIONS_FOR', { date: '' })),
            t('POPOVER_BREWS_OPTION_DETAIL'),
          ),
      },
      {
        name: 'sort beans',
        route: '/home/beans',
        open: (page, t) => addBy(page, t('A11Y.SORT_BEANS')),
        sections: ['SORT_ORDER', 'SORT_AFTER', 'EXTEND_SORT_AFTER'],
      },
      {
        name: 'sort brews',
        route: '/home/brews',
        open: (page, t) => addBy(page, t('A11Y.SORT_BREWS')),
      },
      {
        name: 'filter beans',
        route: '/home/beans',
        open: (page, t) => addBy(page, t('A11Y.FILTER_BEANS')),
      },
      {
        name: 'filter brews',
        route: '/home/brews',
        open: (page, t) => addBy(page, t('A11Y.FILTER_BREWS')),
      },
      {
        name: 'add preparation method',
        route: '/home/profile/preparations',
        open: (page, t) => addBy(page, t('ADD_PREPARATION')),
      },
      {
        name: 'preparation method details',
        route: '/home/profile/preparations',
        open: (page, t) =>
          details(
            page,
            startsWith(t('A11Y.OPTIONS_FOR', { name: '' })),
            t('DETAIL'),
          ),
      },
      {
        name: 'sort preparation methods',
        route: '/home/profile/preparations',
        open: (page, t) => addBy(page, t('A11Y.SORT_PREPARATIONS')),
      },
      {
        name: 'grinder details',
        route: '/home/profile/mills',
        open: (page, t) =>
          details(
            page,
            startsWith(t('A11Y.OPTIONS_FOR', { name: '' })),
            t('DETAIL'),
          ),
      },
      {
        name: 'water details',
        route: '/home/profile/water',
        open: (page, t) =>
          details(
            page,
            startsWith(t('A11Y.OPTIONS_FOR', { name: '' })),
            t('DETAIL'),
          ),
      },
      {
        name: 'grinder choice in the brew form',
        route: '/home/brews',
        open: async (page, t) => {
          await addBy(page, t('ADD_BREW'));
          await visible(
            page.locator('ion-select').filter({ hasText: t('BREW_DATA_MILL') }),
          )
            .first()
            .click();
          await expect(
            page.getByRole('heading', { level: 1, name: t('CHOOSE_MILL') }),
          ).toBeVisible();
        },
      },
    ];

    for (const dialog of dialogs) {
      test(`the ${dialog.name} dialog has its title as the one level-1 heading`, async ({
        page,
      }) => {
        await start(page, language);
        await show(page, dialog.route);
        await dialog.open(page, t);
        await expect(visible(page.getByRole('dialog')).last()).toBeVisible();
        await expectOutline(page, dialog.name);
        if (dialog.sections) {
          const outline = await headingOutline(page);
          expect(
            outline.filter(({ level }) => level === 2).map(({ name }) => name),
          ).toEqual(dialog.sections.map((key) => t(key)));
        }
      });
    }
  });
}

async function details(
  page: Page,
  options: RegExp,
  action: string,
): Promise<void> {
  await visible(page.getByRole('button', { name: options }))
    .first()
    .click();
  await page.getByRole('button', { name: action, exact: true }).click();
}

async function addNamed(
  page: Page,
  t: (key: string) => string,
  name: string,
): Promise<void> {
  await page
    .getByRole('textbox', { name: new RegExp(`^${t('NAME')}`) })
    .fill(name);
  await page.getByRole('button', { name: t('SAVE'), exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('bean groups', () => {
  test('the beans of a group are level-3 headings below the group card', async ({
    page,
  }) => {
    await startWithBeans(page);
    await showBeanSegment(page, 'Frozen');
    await visible(page.getByRole('button', { name: /^Beans in the group / }))
      .first()
      .click();

    const group = visible(
      page.locator('bean-information:not(bean-information bean-information)'),
    ).filter({ has: page.locator('bean-information') });
    await expect(
      group.getByRole('heading', { level: 3, name: new RegExp(BEANS.portion) }),
    ).not.toHaveCount(0);
    await expectOutline(page, 'frozen beans with an open group');
  });
});
