import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { completeFirstRun } from './support/first-run';
import { openFromProfile } from './support/profile';

/**
 * The log can hold what the user entered. Before it leaves the device through
 * the share dialog, the app says so and asks; nothing is shared on Cancel.
 */

// The browser cannot write the file to share; the app logs that as an error.
test.use({ allowedConsoleErrors: [/^Share - could not write the file /] });

const HINT = /^The log helps to find errors\..*do not post it publicly\.$/;

async function openLogs(page: Page): Promise<void> {
  await openFromProfile(page, 'Info & support');
  await page
    .locator('info ion-content')
    .getByRole('link', { name: 'Logs', exact: true })
    .click();
  await expect(page).toHaveURL(/\/info\/logs$/);
}

test('the log page asks before it shares the log', async ({ page }) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openLogs(page);
  const send = page.getByRole('button', { name: 'Send logs' });

  await send.click();
  const question = page.getByRole('alertdialog', { name: 'Share log?' });
  await expect(question).toBeVisible();
  await expect(question.getByText(HINT)).toBeVisible();
  // Focus moves into the question, so it is read first.
  await expect
    .poll(() =>
      question.evaluate((dialog) => dialog.contains(document.activeElement)),
    )
    .toBe(true);
  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toHaveCount(0);

  await send.click();
  await question.getByRole('button', { name: 'Share' }).click();
  await expect(question).toHaveCount(0);

  // The browser cannot write the file to share, so the log is shown as text
  // to copy instead.
  const logText = page.locator('log-text');
  await expect(logText.getByText(HINT)).toBeVisible();
  await logText.getByRole('button', { name: 'Close' }).click();
  await expect(logText).toHaveCount(0);

  // The log shows that only the second request, the one agreed to, tried to
  // write the file.
  await page.getByRole('button', { name: 'back' }).click();
  await page
    .locator('info ion-content')
    .getByRole('link', { name: 'Logs', exact: true })
    .click();
  await expect(
    page.getByText(
      /writeFileForSharing for path - \["share\/Beanconqueror_logs_\d+\.json"\]/,
    ),
  ).toHaveCount(1);
});

test('the question names what is shared and gives the focus back', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);
  await openLogs(page);
  const send = page.getByRole('button', { name: 'Send logs' });

  await send.focus();
  await page.keyboard.press('Enter');
  const question = page.getByRole('alertdialog', { name: 'Share log?' });
  await expect(
    question.getByText(
      'A file with the app and system version, the device model, the types of your Bluetooth devices and your Bluetooth settings comes with it.',
      { exact: false },
    ),
  ).toBeVisible();

  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toHaveCount(0);
  await expect(send).toBeFocused();
});

test('the question to share the log lies above the loading dialog', async ({
  page,
}) => {
  await page.goto('/');
  await completeFirstRun(page);

  // A loading dialog only offers its buttons once a step hangs; the browser
  // has no step that does, so the dialog is opened and its buttons shown
  // through Angular's development hooks.
  await page.evaluate(() => {
    const ng = (window as unknown as { ng: AngularDevHooks }).ng;
    const app = ng.getComponent(document.querySelector('app-root')!) as {
      uiAlert: {
        showLoadingMessage(m: string, t: boolean, d: boolean): Promise<void>;
      };
    };
    void app.uiAlert.showLoadingMessage('PLEASE_WAIT', true, true);
  });
  const loading = page.locator('loading-popover');
  await expect(loading).toBeAttached();
  await loading.evaluate((element) => {
    const ng = (window as unknown as { ng: AngularDevHooks }).ng;
    const popover = ng.getComponent(element) as { showDismissButton(): void };
    popover.showDismissButton();
    ng.applyChanges(element);
  });

  const send = page.getByRole('button', { name: 'Send logs' });
  await send.click();
  const question = page.getByRole('alertdialog', { name: 'Share log?' });
  await expect(question).toBeVisible();
  await expect(question.getByText(HINT)).toBeVisible();
  // Only the question is left to screen readers and the keyboard.
  await expect(send).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Send logs', includeHidden: true }),
  ).toHaveCount(1);
  await expect
    .poll(() =>
      question.evaluate((dialog) => dialog.contains(document.activeElement)),
    )
    .toBe(true);

  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toHaveCount(0);
  await expect(send).toBeVisible();
});

interface AngularDevHooks {
  getComponent(element: Element): unknown;
  applyChanges(component: unknown): void;
}
