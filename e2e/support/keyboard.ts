import type { Page } from '@playwright/test';

/**
 * The key that moves focus to the next control, or with `back` to the one before.
 * Safari's Tab passes over buttons and links unless "Press Tab to highlight each item"
 * is on; Option+Tab always stops on them, as a keyboard on iOS with Full Keyboard Access.
 */
export function tabKey(page: Page, back = false): string {
  const webkit = page.context().browser()?.browserType().name() === 'webkit';
  return `${webkit ? 'Alt+' : ''}${back ? 'Shift+' : ''}Tab`;
}
