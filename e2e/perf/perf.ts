import { cpus } from 'node:os';

import type { FileChooser, Page, TestInfo } from '@playwright/test';

import type { SyntheticDataSet } from '../support/synthetic-data';

/**
 * Measuring helpers for the performance specs. Times come from the page's own clock
 * (`performance.now()`): they start at an event in the page (navigation start, the last input, a
 * file input's `change` event) and end when the page itself sees the result, checked every frame.
 * So Playwright's round trips and polling do not count. They are wall-clock times under the CPU
 * throttling below.
 */

/** CPU slowdown as an approximation of an older Android phone. `PERF_CPU_THROTTLING=1` turns it off. */
export const CPU_THROTTLING = Number(process.env.PERF_CPU_THROTTLING ?? 4);

/** Main thread has to be free of long tasks this long before an interaction counts as settled. */
const QUIET_WINDOW_MS = 1_000;
/** Longest wait for content or a quiet main thread. */
const WAIT_TIMEOUT_MS = 120_000;

/**
 * Share of the machine's CPU time (all cores) above which a test warns that it ran on a busy
 * machine. Other processes slow the throttled page down further: with parallel test runs values
 * were up to twice as high (the longest frame almost five times), so they say nothing about the
 * budgets.
 */
export const BUSY_LIMIT = 0.3;

const SEED_PAGE = '/__perf__/seed';
const SEED_DATA = '/__perf__/data.json';

export interface PerfWindow {
  __perf: {
    longTasks: { start: number; end: number }[];
    /** Time of the last pointer down or text input. */
    lastInput: number;
    /** Times of clicks on download links, i.e. when the app hands a file to the browser. */
    downloads: number[];
    /**
     * Timers as they were before zone.js patched them. Waiting with the patched ones would run
     * Angular change detection on every tick and so change what is measured.
     */
    nextFrame: () => Promise<unknown>;
    sleep: (ms: number) => Promise<unknown>;
  };
}

/**
 * Records long tasks, the last user input and started downloads; runs before the app on every
 * navigation.
 */
export async function installPerfObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    const setTimer = window.setTimeout.bind(window);
    const perf: PerfWindow['__perf'] = {
      longTasks: [],
      lastInput: 0,
      downloads: [],
      nextFrame: () => new Promise((resolve) => requestFrame(resolve)),
      sleep: (ms) => new Promise((resolve) => setTimer(resolve, ms)),
    };
    (window as unknown as PerfWindow).__perf = perf;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        perf.longTasks.push({
          start: entry.startTime,
          end: entry.startTime + entry.duration,
        });
      }
    }).observe({ type: 'longtask', buffered: true });
    const mark = () => {
      perf.lastInput = performance.now();
    };
    document.addEventListener('pointerdown', mark, true);
    document.addEventListener('input', mark, true);
    // The web build downloads a file by clicking a temporary <a download> in the document.
    document.addEventListener(
      'click',
      (event) => {
        if (
          event.target instanceof HTMLAnchorElement &&
          event.target.hasAttribute('download')
        ) {
          perf.downloads.push(performance.now());
        }
      },
      true,
    );
  });
}

/**
 * Writes the data set into the app's database before the app starts, as an existing installation
 * would have it: Ionic Storage keeps one entry per collection in the IndexedDB store `_ionickv`
 * of the database `__baristaDB` (src/main.ts). A blank page on the app origin does the writing,
 * so the app is not running meanwhile.
 */
export async function seedDatabase(
  page: Page,
  data: SyntheticDataSet,
  json: string = JSON.stringify(data),
): Promise<void> {
  await page.route(`**${SEED_PAGE}`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>seed</title>',
    }),
  );
  await page.route(`**${SEED_DATA}`, (route) =>
    route.fulfill({ contentType: 'application/json', body: json }),
  );
  await page.goto(SEED_PAGE);
  await page.evaluate(async (url) => {
    const entries = (await (await fetch(url)).json()) as Record<
      string,
      unknown
    >;
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('__baristaDB');
      request.onupgradeneeded = () =>
        request.result.createObjectStore('_ionickv');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('open failed'));
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('_ionickv', 'readwrite');
      const store = transaction.objectStore('_ionickv');
      for (const [key, value] of Object.entries(entries)) {
        store.put(value, key);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('write failed'));
    });
    db.close();
  }, SEED_DATA);
  await page.unroute(`**${SEED_PAGE}`);
  await page.unroute(`**${SEED_DATA}`);
}

export async function throttleCpu(page: Page): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setCPUThrottlingRate', {
    rate: CPU_THROTTLING,
  });
}

export interface Timing {
  /** From the input (or navigation start) until the expected content is shown. */
  visible: number;
  /** Until the main thread is also free of long tasks (`QUIET_WINDOW_MS`), like time to interactive. */
  settled: number;
  /** Long tasks in that period: their sum and the longest one. */
  longTasksTotal: number;
  longestTask: number;
}

/** Content that has to be on screen: an element matching `selector`, optionally with `text`. */
export interface Expected {
  selector: string;
  text?: string;
}

/**
 * Waits until `expected` is shown, then until the main thread stays quiet, and returns the times
 * relative to `from`: `'navigation'` (page start), `'input'` (the last pointer down or text
 * input, so the click itself and Playwright's checks are not counted) or the last performance
 * mark of that name (see `markFileChange`).
 */
export async function waitUntilSettled(
  page: Page,
  expected: Expected,
  from: 'navigation' | 'input' | { mark: string },
): Promise<Timing> {
  return page.evaluate(
    async ({ selector, text, from, quietWindow, timeout }) => {
      const perf = (window as unknown as PerfWindow).__perf;
      const isShown = () =>
        [...document.querySelectorAll(selector)].some((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.bottom > 0 &&
            box.top < window.innerHeight &&
            (text === undefined || (element.textContent ?? '').includes(text))
          );
        });
      const waitStart = performance.now();
      while (!isShown()) {
        if (performance.now() - waitStart > timeout) {
          throw new Error(
            `${selector}${text === undefined ? '' : ` with "${text}"`} not shown`,
          );
        }
        await perf.nextFrame();
      }
      const visibleAt = performance.now();
      let start: number;
      if (from === 'navigation') {
        start = 0;
      } else if (from === 'input') {
        start = perf.lastInput;
      } else {
        const marks = performance.getEntriesByName(from.mark, 'mark');
        if (marks.length === 0) {
          throw new Error(`no performance mark "${from.mark}"`);
        }
        start = marks[marks.length - 1].startTime;
      }
      const lastEnd = () =>
        perf.longTasks.reduce((latest, task) => Math.max(latest, task.end), 0);
      while (performance.now() - Math.max(visibleAt, lastEnd()) < quietWindow) {
        if (performance.now() - visibleAt > timeout) {
          throw new Error('main thread never became quiet');
        }
        await perf.sleep(100);
      }
      const settledAt = Math.max(visibleAt, lastEnd());
      const tasks = perf.longTasks
        .filter((t) => t.end > start && t.start < settledAt)
        .map((t) => Math.min(t.end, settledAt) - Math.max(t.start, start));
      return {
        visible: Math.round(visibleAt - start),
        settled: Math.round(settledAt - start),
        longTasksTotal: Math.round(tasks.reduce((sum, t) => sum + t, 0)),
        longestTask: Math.round(Math.max(0, ...tasks)),
      };
    },
    {
      ...expected,
      from,
      quietWindow: QUIET_WINDOW_MS,
      timeout: WAIT_TIMEOUT_MS,
    },
  );
}

/**
 * Sets the performance mark `name` when the app gets the files of `chooser`: on the `change` event
 * of its file input, which Playwright's `setFiles` fires after handing over the files.
 */
export async function markFileChange(
  chooser: FileChooser,
  name: string,
): Promise<void> {
  await chooser.element().evaluate((input, mark) => {
    input.addEventListener('change', () => performance.mark(mark), {
      capture: true,
      once: true,
    });
  }, name);
}

/**
 * Milliseconds from the last input until the app started a download, from the page's clock. Call
 * it after Playwright reported the download.
 */
export async function downloadAfterInput(page: Page): Promise<number> {
  return page.evaluate(() => {
    const perf = (window as unknown as PerfWindow).__perf;
    const started = perf.downloads.find((time) => time >= perf.lastInput);
    if (started === undefined) {
      throw new Error('no download link was clicked after the last input');
    }
    return Math.round(started - perf.lastInput);
  });
}

let machineLoad: { testId: string; busy: number } | undefined;

/**
 * Measures how much of all cores' CPU time the machine uses, before the test starts the app and
 * again after the measurement, for load that started meanwhile: the lowest share of five 200 ms
 * samples, so the test's own browser starting or settling does not count, but other test runs or
 * builds do. The higher share of both goes into the test's `PERF` lines as `machineBusy`
 * (percent); above `BUSY_LIMIT` the test prints a warning, and `busyNote` adds it to failed
 * budgets.
 */
export async function measureMachineLoad(
  testInfo: TestInfo,
  when: 'before' | 'after',
): Promise<void> {
  const sample = async () => {
    const before = cpus().map((cpu) => cpu.times);
    await new Promise((resolve) => setTimeout(resolve, 200));
    let total = 0;
    let idle = 0;
    cpus().forEach(({ times: after }, i) => {
      const sum = (t: typeof after) => t.user + t.nice + t.sys + t.irq + t.idle;
      total += sum(after) - sum(before[i]);
      idle += after.idle - before[i].idle;
    });
    return total > 0 ? 1 - idle / total : 0;
  };
  let busy = 1;
  for (let i = 0; i < 5; i++) {
    busy = Math.min(busy, await sample());
  }
  const earlier = when === 'after' ? (busyAround(testInfo) ?? 0) : 0;
  machineLoad = { testId: testInfo.testId, busy: Math.max(earlier, busy) };
  if (busy > BUSY_LIMIT) {
    const moment = when === 'before' ? 'before' : 'after the measurement of';
    const warning =
      `machine ${Math.round(busy * 100)} % busy ${moment} "${testInfo.title}": ` +
      'the values are not comparable with the budgets; run again on an idle machine';
    console.log(`PERF-WARNING ${warning}`);
    testInfo.annotations.push({ type: 'warning', description: warning });
  }
}

/** How busy the machine was around this test's measurement (0–1), if it was measured. */
function busyAround(testInfo: TestInfo): number | undefined {
  return machineLoad?.testId === testInfo.testId ? machineLoad.busy : undefined;
}

/** A hint for a failed budget when the machine was busy around the test, otherwise ''. */
export function busyNote(testInfo: TestInfo): string {
  const busy = busyAround(testInfo);
  return busy !== undefined && busy > BUSY_LIMIT
    ? `, machine ${Math.round(busy * 100)} % busy`
    : '';
}

export interface ScrollResult {
  /** From the first scroll step until the last entry is rendered. */
  duration: number;
  frames: number;
  /** Frames that took longer than 50 ms (below 20 fps). */
  slowFrames: number;
  longestFrame: number;
  longestTask: number;
}

/**
 * Scrolls the virtual list that contains `firstItemId` down by `stepScreens` screen heights per
 * frame until the element `lastItemId` is rendered at the bottom, like a fast fling.
 */
export async function scrollListToEnd(
  page: Page,
  firstItemId: string,
  lastItemId: string,
  stepScreens = 3,
): Promise<ScrollResult> {
  return page.evaluate(
    async ({ firstItemId, lastItemId, stepScreens }) => {
      const perf = (window as unknown as PerfWindow).__perf;
      const scroller = document
        .getElementById(firstItemId)
        ?.closest('ag-virtual-scroll');
      if (!scroller) {
        throw new Error(`No virtual list around #${firstItemId}`);
      }
      const nextFrame = perf.nextFrame;
      await nextFrame();
      const start = performance.now();
      const frames: number[] = [];
      let previous = start;
      for (;;) {
        const atBottom =
          scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 2;
        if (atBottom && document.getElementById(lastItemId)) {
          break;
        }
        if (performance.now() - start > 600_000) {
          throw new Error(`#${lastItemId} not reached after 10 minutes`);
        }
        scroller.scrollTop += scroller.clientHeight * stepScreens;
        await nextFrame();
        const now = performance.now();
        frames.push(now - previous);
        previous = now;
      }
      const end = performance.now();
      const tasks = perf.longTasks
        .filter((t) => t.end > start && t.start < end)
        .map((t) => t.end - t.start);
      return {
        duration: Math.round(end - start),
        frames: frames.length,
        slowFrames: frames.filter((f) => f > 50).length,
        longestFrame: Math.round(Math.max(0, ...frames)),
        longestTask: Math.round(Math.max(0, ...tasks)),
      };
    },
    { firstItemId, lastItemId, stepScreens },
  );
}

/**
 * Prints a measurement as one `PERF {…}` line (collect them over runs with
 * `grep '^PERF'`) and attaches all of a test's values to the report.
 */
export function report(
  testInfo: TestInfo,
  brews: number,
  name: string,
  values: Record<string, number>,
): void {
  const busy = busyAround(testInfo);
  const entry = {
    brews,
    name,
    cpuThrottling: CPU_THROTTLING,
    ...(busy === undefined ? {} : { machineBusy: Math.round(busy * 100) }),
    ...values,
  };
  console.log(`PERF ${JSON.stringify(entry)}`);
  testInfo.annotations.push({
    type: 'perf',
    description: `${name}: ${Object.entries(values)
      .map(([key, value]) => `${key} ${value}`)
      .join(', ')}`,
  });
}
