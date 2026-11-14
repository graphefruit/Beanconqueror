import type { Page } from '@playwright/test';

/**
 * Presses the Android back key the way Ionic delivers it on a device: an
 * `ionBackButton` event collects the registered handlers and the one with the
 * highest priority (the last registered on a tie) runs. The web build blocks
 * the hardware key, so the event is raised here instead.
 */
export async function pressHardwareBack(page: Page): Promise<void> {
  await page.evaluate(() => {
    type Handler = (processNext: () => void) => unknown;
    const handlers: { priority: number; handler: Handler }[] = [];
    document.dispatchEvent(
      new CustomEvent('ionBackButton', {
        detail: {
          register: (priority: number, handler: Handler) =>
            handlers.push({ priority, handler }),
        },
      }),
    );
    const next = () => {
      let chosen: (typeof handlers)[number] | undefined;
      for (const entry of handlers) {
        if (!chosen || entry.priority >= chosen.priority) {
          chosen = entry;
        }
      }
      if (chosen) {
        handlers.splice(handlers.indexOf(chosen), 1);
        void chosen.handler(next);
      }
    };
    next();
  });
}
