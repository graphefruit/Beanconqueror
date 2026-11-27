import { expect, test, type Locator } from '@playwright/test';

import { openAddBrew, showBrewsTab } from '../support/brew-form';
import { generateDataSet } from '../support/synthetic-data';
import {
  APKS,
  clearAppData,
  closeApp,
  coldStart,
  installApp,
  instrument,
  seedRunningApp,
  shell,
  waitForStart,
} from './device';

/**
 * The on-screen keyboard does not cover the focused field: a field in the lower part of the brew
 * form (the notes) is focused, and once the keyboard is open the field lies above it. Where the keyboard and
 * the WebView are comes from Android (`dumpsys window`, `uiautomator dump`), not from the page,
 * which cannot tell whether something covers it.
 *
 *   pnpm e2e:device keyboard
 */

/** Top and bottom edge on the screen, in device pixels. */
interface Edges {
  top: number;
  bottom: number;
}

/** The window of the on-screen keyboard while it shows, or undefined. */
async function keyboard(): Promise<Edges | undefined> {
  const out = await shell('dumpsys window InputMethod');
  if (!/isOnScreen=true|isVisible=true/.test(out)) {
    return undefined;
  }
  // The visible part of the keyboard window; the window itself may cover the whole screen.
  const frame = /touchable region=SkRegion\(\((\d+),(\d+),(\d+),(\d+)\)\)/.exec(
    out,
  );
  return frame
    ? { top: Number(frame[2]), bottom: Number(frame[4]) }
    : undefined;
}

/** The app's WebView on the screen. */
async function webView(): Promise<Edges> {
  const dump = await shell(
    'uiautomator dump /data/local/tmp/bq-window.xml >/dev/null && cat /data/local/tmp/bq-window.xml; rm /data/local/tmp/bq-window.xml',
  );
  const bounds =
    /class="android\.webkit\.WebView"[^>]*bounds="\[\d+,(\d+)\]\[\d+,(\d+)\]"/.exec(
      dump,
    );
  if (!bounds) {
    throw new Error('WebView not found on the screen');
  }
  return { top: Number(bounds[1]), bottom: Number(bounds[2]) };
}

/** The field on the screen: its box in the page, scaled and moved to the WebView. */
async function onScreen(field: Locator, view: Edges): Promise<Edges> {
  const { top, bottom, ratio } = await field.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      top: box.top,
      bottom: box.bottom,
      ratio: window.devicePixelRatio,
    };
  });
  return { top: view.top + top * ratio, bottom: view.top + bottom * ratio };
}

test('the focused field stays visible above the keyboard', async () => {
  test.setTimeout(5 * 60_000);
  await installApp(APKS.debug);
  await clearAppData();
  let app = await coldStart();
  await seedRunningApp(
    app.page,
    // Up to today, so that the beans are still open and the form offers them.
    generateDataSet({
      brews: 5,
      beans: 10,
      archivedBeanShare: 0,
      endDate: new Date(new Date().setUTCHours(0, 0, 0, 0)),
    }),
  );
  await closeApp(app);

  app = await coldStart();
  const page = app.page;
  await instrument(page);
  await waitForStart(page, '5', app.launchedAt);
  await showBrewsTab(page);
  await openAddBrew(page);
  const field = page.getByRole('textbox', { name: 'Notes' });
  // Into the lower part of the screen, where the keyboard will open.
  await field.evaluate((element) =>
    element.scrollIntoView({ block: 'end', behavior: 'instant' }),
  );
  const before = await onScreen(field, await webView());

  await field.click();
  let keys: Edges | undefined;
  await expect
    .poll(async () => (keys = await keyboard()), { timeout: 30_000 })
    .toBeDefined();
  const keyboardTop = keys!.top;
  // The test only means something if the keyboard would have covered the field where it was.
  expect(before.bottom).toBeGreaterThan(keyboardTop);

  await expect
    .poll(
      async () => {
        const view = await webView();
        const now = await onScreen(field, view);
        console.log(
          `KEYBOARD ${JSON.stringify({ keyboardTop, before, now, view })}`,
        );
        return now.top >= view.top && now.bottom <= keyboardTop;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  await expect(field).toBeFocused();
  await closeApp(app);
});
