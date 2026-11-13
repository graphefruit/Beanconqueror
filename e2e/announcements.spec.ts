import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRunWithBrew } from './support/first-brew';
import { completeFirstRun } from './support/first-run';
import { toast } from './support/toast';

/**
 * Screen readers announce toasts and loading messages from one live region,
 * the Angular CDK's (`.cdk-live-announcer-element`). These tests read what is
 * written there, as a screen reader would be told, and that no other live
 * region speaks the same message at the same time.
 */

/** A message written to the app's live region. */
interface Announcement {
  text: string;
  politeness: string | null;
  /** Other live regions in the page, shadow roots included, holding the same text then. */
  echoes: number;
}

/** A loading dialog, as it was when it started to close. */
interface LoadingDialog {
  name: string | null;
  focusInside: boolean;
}

interface Recorder {
  announcements: Announcement[];
  loadingDialogs: LoadingDialog[];
}

/** Runs in the page before the app starts. */
function record(): void {
  const recorder = window as unknown as Recorder;
  recorder.announcements = [];
  recorder.loadingDialogs = [];

  const LIVE_ROLES = ['status', 'alert', 'log'];
  // An aria-live attribute overrides the role's implicit value; "off" is not live.
  const isLive = (element: Element): boolean => {
    const live = element.getAttribute('aria-live');
    return live === null
      ? LIVE_ROLES.includes(element.getAttribute('role') ?? '')
      : live === 'polite' || live === 'assertive';
  };
  const liveRegionsHolding = (
    root: Document | ShadowRoot,
    text: string,
  ): Element[] =>
    [...root.querySelectorAll('*')].flatMap((element) => [
      ...(isLive(element) && element.textContent?.includes(text)
        ? [element]
        : []),
      ...(element.shadowRoot
        ? liveRegionsHolding(element.shadowRoot, text)
        : []),
    ]);

  let written = '';
  new MutationObserver(() => {
    const region = document.querySelector('.cdk-live-announcer-element');
    const text = region?.textContent ?? '';
    if (text === written) {
      return;
    }
    written = text;
    if (region && text) {
      recorder.announcements.push({
        text,
        politeness: region.getAttribute('aria-live'),
        echoes: liveRegionsHolding(document, text).filter(
          (element) => element !== region,
        ).length,
      });
    }
  }).observe(document, { childList: true, characterData: true, subtree: true });

  document.addEventListener(
    'ionModalWillDismiss',
    (event) => {
      const modal = event.target as HTMLElement;
      if (modal.querySelector('loading-popover')) {
        recorder.loadingDialogs.push({
          name:
            modal.shadowRoot
              ?.querySelector('[role="dialog"]')
              ?.getAttribute('aria-label') ?? null,
          focusInside: modal.contains(document.activeElement),
        });
      }
    },
    true,
  );
}

function recorded(page: Page): Promise<Recorder> {
  return page.evaluate(() => {
    const { announcements, loadingDialogs } = window as unknown as Recorder;
    return { announcements, loadingDialogs };
  });
}

async function forgetRecorded(page: Page): Promise<void> {
  await page.evaluate(() => {
    const recorder = window as unknown as Recorder;
    recorder.announcements.length = 0;
    recorder.loadingDialogs.length = 0;
  });
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'menu' }).click();
  await page
    .getByRole('link', { name: 'Settings' })
    .or(page.getByRole('button', { name: 'Settings' }))
    .or(page.getByRole('menuitem', { name: 'Settings' }))
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: /^Language Settings/ }),
  ).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(record);
});

test('a saved brew is announced once, from the live region only', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRunWithBrew(page);

  await expect
    .poll(async () => (await recorded(page)).announcements)
    .toContainEqual({
      text: 'Brew added successfully',
      politeness: 'polite',
      echoes: 0,
    });
  // Anything announced again for the same toast would come while it is shown.
  await expect(toast(page, 'Brew added successfully')).toHaveCount(0);
  const { announcements } = await recorded(page);
  expect(
    announcements.filter(({ text }) => text === 'Brew added successfully'),
  ).toHaveLength(1);
});

test('an export announces its loading message once and does not take focus', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openSettings(page);
  const exportData = page.getByRole('button', { name: /^Export\b/ });
  await exportData.focus();
  await forgetRecorded(page);

  const download = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  await download;

  await expect
    .poll(async () => (await recorded(page)).loadingDialogs)
    .toEqual([{ name: 'Please wait...', focusInside: false }]);
  // Ionic hands focus back to the control that opened the dialog.
  await expect(exportData).toBeFocused();
  // Closing says nothing.
  expect((await recorded(page)).announcements).toEqual([
    { text: 'Please wait...', politeness: 'polite', echoes: 0 },
  ]);
});

test('the live region stays above an open dialog and out of what it hides', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await page.getByRole('tab', { name: 'Beans' }).click();
  await page.getByRole('button', { name: 'Add bean' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // VoiceOver drops live regions outside an open dialog unless they are
  // stacked above it, and Ionic counts up the stacking order of its overlays.
  const dialogLayer = await dialog.evaluate((element) => {
    const root = element.getRootNode();
    const host = root instanceof ShadowRoot ? root.host : element;
    return Number(getComputedStyle(host).zIndex);
  });
  const region = page.locator('.cdk-live-announcer-element');
  const { layer, concealed } = await region.evaluate((element) => ({
    layer: Number(getComputedStyle(element).zIndex),
    concealed: element.closest('[aria-hidden="true"], [inert]') !== null,
  }));
  expect(dialogLayer).toBeGreaterThanOrEqual(20000);
  expect(layer).toBeGreaterThan(dialogLayer);
  expect(concealed).toBe(false);
});
