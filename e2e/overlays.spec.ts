import type { Locator } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';

/**
 * Keyboard and screen reader users must land inside an overlay when it opens
 * and back on the control that opened it when it closes; otherwise they lose
 * their place in the page. Ionic handles both for modals and alerts as long as
 * the trigger is still in the page.
 */

/**
 * Ionic moves focus to the overlay's host element (a modal's role="dialog"
 * wrapper lives in its shadow root), so "inside" means inside that host.
 */
async function expectFocusInside(overlay: Locator): Promise<void> {
  await expect
    .poll(() =>
      overlay.evaluate((element) => {
        const root = element.getRootNode();
        const host = root instanceof ShadowRoot ? root.host : element;
        return host.contains(document.activeElement);
      }),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await page.getByRole('tab', { name: 'Beans' }).click();
});

test('a dialog takes focus when it opens and hands it back to its trigger', async ({
  page,
}) => {
  const addBean = page.getByRole('button', { name: 'Add bean' });
  await addBean.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expectFocusInside(dialog);
  // Content is rendered and reachable, not just an empty frame.
  await expect(
    page.getByRole('textbox', { name: /^Name/, disabled: false }),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(addBean).toBeFocused();
});

test('an alert takes focus when it opens and hands it back to its trigger', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Add bean' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Opened from the keyboard: Ionic layers the select's visible wrapper over
  // its button, so a pointer click on the button itself never lands.
  const roastType = page.getByRole('button', { name: /^Roast type/ });
  await roastType.focus();
  await page.keyboard.press('Enter');

  const alert = page.getByRole('alertdialog', { name: 'Roast type' });
  await expect(alert).toBeVisible();
  // The select puts focus on the chosen option while the alert opens, and
  // Ionic moves it to the alert itself once the alert has opened. Focus put
  // elsewhere before then would be taken away again.
  await expect(alert).toBeFocused();
  await expect(alert.getByRole('radio', { name: 'Unknown' })).toBeVisible();
  await expect(alert.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await alert.getByRole('button', { name: 'Cancel' }).focus();
  await page.keyboard.press('Enter');
  await expect(alert).toHaveCount(0);
  await expect(roastType).toBeFocused();
});
