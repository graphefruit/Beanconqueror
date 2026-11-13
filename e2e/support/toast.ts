import type { Locator, Page } from '@playwright/test';

/**
 * The toast showing `text`. Screen readers announce toasts from the app's
 * live region (`.cdk-live-announcer-element`), which holds the same text for a
 * while, so `page.getByText` would find it twice. The toast's message sits in
 * an element with role="status".
 */
export function toast(page: Page, text: string): Locator {
  return page.getByRole('status').filter({ hasText: text });
}
