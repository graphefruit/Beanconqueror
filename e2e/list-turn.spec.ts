import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { BEANS } from './support/bean-data';
import { beanCard, showBeanSegment, startWithBeans } from './support/beans';
import { seedDatabase } from './support/seed';
import { generateDataSet } from './support/synthetic-data';
import { isUncovered, scrollToEnd, VIRTUAL_LIST } from './support/virtual-list';

/**
 * The lists measure their cards; a card gets higher or lower when the device
 * is turned. The entry at the top stays there, and the cards keep their
 * place while the list is scrolled up over cards not measured yet.
 */

const PORTRAIT = { width: 412, height: 839 };
const LANDSCAPE = { width: 839, height: 412 };

function list(page: Page): Locator {
  return page.locator(VIRTUAL_LIST).filter({ visible: true });
}

async function showBrews(page: Page): Promise<void> {
  await seedDatabase(
    page,
    generateDataSet({
      brews: 200,
      beans: 20,
      endDate: new Date('2026-11-01T18:00:00Z'),
    }),
  );
  await page.goto('/');
  await page.getByRole('tab', { name: 'Brews', exact: true }).click();
  await expect(list(page).locator('brew-information').first()).toBeVisible();
}

interface TopEntry {
  /** The place of the entry in the whole list. */
  position: string | null;
  /** How far the top of the entry lies below the top of the list (above: negative). */
  offset: number;
}

/** The entry at the top of the list, the first one reaching into its scroller. */
function topEntry(page: Page): Promise<TopEntry> {
  return list(page).evaluate((element) => {
    const top = element
      .closest('ion-content')!
      .shadowRoot!.querySelector('.inner-scroll')!
      .getBoundingClientRect().top;
    const row = [...element.querySelectorAll('[role="listitem"]')].find(
      (candidate) => candidate.getBoundingClientRect().bottom > top + 1,
    )!;
    return {
      position: row.getAttribute('aria-posinset'),
      offset: Math.round(row.getBoundingClientRect().top - top),
    };
  });
}

/** Scrolls the list to the middle of its length, as a jump back does. */
async function jumpToMiddle(page: Page): Promise<void> {
  await list(page).evaluate((element) => {
    const scroller = element
      .closest('ion-content')!
      .shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    scroller.scrollTop = scroller.scrollHeight / 2;
  });
  // The rows near the new place are measured; then the list rests.
  await expectStill(page);
}

async function expectStill(page: Page): Promise<TopEntry> {
  let previous: TopEntry | undefined;
  await expect(async () => {
    const now = await topEntry(page);
    const still = JSON.stringify(now) === JSON.stringify(previous);
    previous = now;
    expect(still).toBe(true);
  }).toPass({ intervals: [250] });
  return previous!;
}

async function expectSameTopEntryWhenTurned(page: Page): Promise<void> {
  const before = await expectStill(page);
  for (const size of [LANDSCAPE, PORTRAIT]) {
    await page.setViewportSize(size);
    const after = await expectStill(page);
    expect(after.position).toBe(before.position);
    expect(Math.abs(after.offset - before.offset)).toBeLessThanOrEqual(3);
  }
}

/**
 * The last card is shown whole above the add button: the list is as long as
 * its cards, not as the cards were in the other width.
 */
async function expectLastCardReachable(
  page: Page,
  card: string,
  options: RegExp,
): Promise<void> {
  await scrollToEnd(list(page));
  const last = list(page).locator(card).last();
  await expect(last).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() => isUncovered(last.getByRole('button', { name: options })))
    .toBe(true);
}

test('the brew at the top stays there when the device is turned', async ({
  page,
}) => {
  await page.setViewportSize(PORTRAIT);
  await showBrews(page);
  await jumpToMiddle(page);

  await expectSameTopEntryWhenTurned(page);

  await expectLastCardReachable(
    page,
    'brew-information',
    /^Options for the brew of /,
  );
});

test('the bean at the top stays there when the device is turned', async ({
  page,
}) => {
  await page.setViewportSize(PORTRAIT);
  await startWithBeans(page, { extraBeans: 60 });
  await jumpToMiddle(page);

  await expectSameTopEntryWhenTurned(page);

  await expectLastCardReachable(page, 'bean-information', /^Options for /);
});

test('an open group of frozen beans keeps its place when the device is turned', async ({
  page,
}) => {
  await page.setViewportSize(PORTRAIT);
  await startWithBeans(page);
  await showBeanSegment(page, 'Frozen');
  const toggle = beanCard(page, BEANS.portion)
    .first()
    .getByRole('button', { name: /^Beans in the group / });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await expectSameTopEntryWhenTurned(page);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('the cards keep their place while the list is scrolled up over cards not measured yet', async ({
  page,
}) => {
  await page.setViewportSize(PORTRAIT);
  await showBrews(page);
  // Turned there and back: cards measured in the other width count no more.
  await page.setViewportSize(LANDSCAPE);
  await jumpToMiddle(page);
  await page.setViewportSize(PORTRAIT);
  await expectStill(page);

  // 50px a step. A card at the top of the list is followed through the frames after
  // each step: every frame must show it 50px lower, never moved by a card
  // measured above it.
  const moves = await list(page).evaluate(async (element) => {
    const scroller = element
      .closest('ion-content')!
      .shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const found: number[] = [];
    for (let step = 0; step < 40; step++) {
      const below = scroller.getBoundingClientRect().top;
      const card = [...element.querySelectorAll('brew-information')].find(
        (candidate) => candidate.getBoundingClientRect().top >= below,
      )!;
      const before = card.getBoundingClientRect().top;
      scroller.scrollTop -= 50;
      // The frame that handles the scroll, then the frames it painted.
      await frame();
      for (let painted = 0; painted < 3; painted++) {
        await frame();
        found.push(Math.round(card.getBoundingClientRect().top - before));
      }
    }
    return found;
  });

  expect(moves).toEqual(moves.map(() => 50));
});

/** The first card and how far below the top of the list it starts. */
function start(page: Page) {
  return list(page).evaluate((element) => {
    const top = element
      .closest('ion-content')!
      .shadowRoot!.querySelector('.inner-scroll')!
      .getBoundingClientRect().top;
    const first = element.querySelector('[role="listitem"]')!;
    return {
      position: first.getAttribute('aria-posinset'),
      gap: Math.round(first.getBoundingClientRect().top - top),
    };
  });
}

test('after a fast scroll to the top the first brew starts at the top of the list', async ({
  page,
}) => {
  await page.setViewportSize(PORTRAIT);
  await showBrews(page);
  const atStart = await start(page);
  await page.setViewportSize(LANDSCAPE);
  await jumpToMiddle(page);
  await page.setViewportSize(PORTRAIT);
  await expectStill(page);

  // One screen a frame, to the top.
  await list(page).evaluate(async (element) => {
    const scroller = element
      .closest('ion-content')!
      .shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    while (scroller.scrollTop > 0) {
      scroller.scrollTop -= scroller.clientHeight;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });

  await expect.poll(() => start(page)).toEqual(atStart);
});

test('after a brew is deleted sideways the first brew starts at the top of the list', async ({
  page,
}) => {
  // As an iPad reports itself: the list then holds its corrections while a
  // finger is on it.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel' });
  });
  await page.setViewportSize(LANDSCAPE);
  await showBrews(page);
  const atStart = await start(page);
  await jumpToMiddle(page);

  // The next brew is brought to the top of the list, its options button on
  // the screen.
  const id = await list(page).evaluate((element) => {
    const scroller = element
      .closest('ion-content')!
      .shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    const below = scroller.getBoundingClientRect().top;
    const card = [...element.querySelectorAll('brew-information')].find(
      (candidate) => candidate.getBoundingClientRect().top > below,
    )!;
    scroller.scrollTop += card.getBoundingClientRect().top - below;
    return card.getAttribute('id')!;
  });
  await expectStill(page);
  const card = page.locator(`[id="${id}"]`);
  await card.getByRole('button', { name: /^Options for the brew of / }).tap();
  await page.getByRole('button', { name: 'Delete', exact: true }).tap();
  await page
    .getByRole('alertdialog', { name: /Delete brew\?/ })
    .getByRole('button', { name: 'Yes' })
    .tap();
  await expect(card).toHaveCount(0);

  await list(page).evaluate(async (element) => {
    const scroller = element
      .closest('ion-content')!
      .shadowRoot!.querySelector<HTMLElement>('.inner-scroll')!;
    while (scroller.scrollTop > 0) {
      scroller.scrollTop -= scroller.clientHeight;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });

  await expect.poll(() => start(page)).toEqual(atStart);
});
