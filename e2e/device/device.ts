import { execFile, spawn } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { chromium, type Browser, type Page } from '@playwright/test';

import { observePerf, type PerfWindow } from '../perf/perf';

/**
 * Drives the debug build of the app on an Android phone over ADB (see DEVELOPING.md, "Device
 * tests"). Playwright connects to the app's WebView through the Chrome DevTools Protocol: debug
 * builds open the socket `webview_devtools_remote_<pid>`, which `adb forward` makes a local port.
 * Only the package below is installed, started, stopped and cleared.
 */

export const APP_ID = 'com.beanconqueror.app';
const ACTIVITY = `${APP_ID}/com.beanconqueror.MainActivity`;

/** `adb` from `ADB`, `ANDROID_HOME`/`ANDROID_SDK_ROOT` or the PATH. `ANDROID_SERIAL` picks the phone. */
const ADB =
  process.env.ADB ??
  ((process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT)
    ? join(
        (process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT)!,
        'platform-tools',
        'adb',
      )
    : 'adb');

/** Local port for the WebView's DevTools socket. */
const CDP_PORT = Number(process.env.DEVICE_CDP_PORT ?? 9333);

const run = promisify(execFile);

export async function adb(...args: string[]): Promise<string> {
  const { stdout } = await run(ADB, args, { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

export function shell(command: string): Promise<string> {
  return adb('shell', command);
}

async function poll<T>(
  what: string,
  check: () => Promise<T | undefined>,
  timeout = 60_000,
): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() - start > timeout) {
      throw new Error(`${what} not found after ${timeout} ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function installApp(apk: string): Promise<void> {
  await adb('install', '-r', apk);
}

/** Deletes the app's data, like a fresh installation. */
export async function clearAppData(): Promise<void> {
  await shell(`pm clear ${APP_ID}`);
}

export async function stopApp(): Promise<void> {
  await shell(`am force-stop ${APP_ID}`);
}

export interface RunningApp {
  browser: Browser;
  page: Page;
  pid: number;
  /** Device clock (ms since 1970) right before `am start`. */
  launchedAt: number;
  /** `TotalTime` of `am start -W`: until the activity drew its first frame (splash screen). */
  activityTotalTime: Promise<number | undefined>;
}

/**
 * Cold start: stops the app (its caches stay), wakes the screen and starts the activity, then
 * connects to the WebView as soon as its DevTools socket is there. The page usually still loads
 * then; times are taken from the page's own clock, so the connection does not count.
 */
export async function coldStart(): Promise<RunningApp> {
  await stopApp();
  await shell('input keyevent KEYCODE_WAKEUP');
  // The device clock right before the start; `am start -W` answers once the activity is drawn.
  let launchedAt: (time: number) => void = () => undefined;
  const launched = new Promise<number>((resolve) => (launchedAt = resolve));
  const launch = new Promise<string>((resolve, reject) => {
    const child = spawn(ADB, [
      'shell',
      `date +%s%3N; am start -W -n ${ACTIVITY}`,
    ]);
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString();
      if (out.includes('\n')) {
        launchedAt(Number(out.split('\n')[0]));
      }
    });
    child.on('error', reject);
    child.on('close', () => resolve(out));
  });
  const pid = await poll('app process', async () => {
    const out = (await shell(`pidof ${APP_ID}`).catch(() => '')).trim();
    return out ? Number(out.split(/\s+/)[0]) : undefined;
  });
  const socket = `webview_devtools_remote_${pid}`;
  await poll('WebView DevTools socket', async () =>
    (await shell('cat /proc/net/unix')).includes(`@${socket}`)
      ? true
      : undefined,
  );
  await adb('forward', `tcp:${CDP_PORT}`, `localabstract:${socket}`);
  const browser = await chromium.connectOverCDP(
    `http://127.0.0.1:${CDP_PORT}`,
    {
      timeout: 30_000,
    },
  );
  const page = await poll('WebView page', () =>
    Promise.resolve(
      browser
        .contexts()
        .flatMap((context) => context.pages())
        .find((p) => p.url().startsWith('https://')),
    ),
  );
  // While the lock screen shows, the app's activity is not shown (the app does not set
  // `showWhenLocked`) and its WebView draws no frames, so every measurement would hang. The page
  // cannot tell: its visibilityState stays "visible". Nothing here gets past the lock screen.
  try {
    await poll(
      'unlocked screen',
      async () => {
        const windows = await shell('dumpsys window');
        return windows.includes('isKeyguardShowing=true') ? undefined : true;
      },
      5_000,
    );
  } catch {
    throw new Error(
      'The lock screen shows: unlock the phone and keep the screen on.',
    );
  }
  return {
    browser,
    page,
    pid,
    launchedAt: await launched,
    activityTotalTime: launch.then((output) => {
      const totalTime = /TotalTime: (\d+)/.exec(output);
      return totalTime ? Number(totalTime[1]) : undefined;
    }),
  };
}

export async function closeApp(app: RunningApp): Promise<void> {
  await app.browser.close().catch(() => undefined);
  await stopApp();
  await adb('forward', '--remove', `tcp:${CDP_PORT}`).catch(() => undefined);
}

/**
 * Writes the data set into the running app's database (Ionic Storage: IndexedDB `__baristaDB`,
 * store `_ionickv`, one entry per collection, see e2e/support/seed.ts). Stop the app right
 * afterwards, so it does not write over the data; the next start reads it like an existing
 * installation.
 */
export async function seedRunningApp(page: Page, data: object): Promise<void> {
  // Not before the app has started on its empty data and shows the welcome dialog: before, the
  // app creates its database (both would create it at the same time, and the seed may find no
  // object store) and writes its defaults, which would replace the seeded entries.
  await page
    .locator('ion-modal')
    .first()
    .waitFor({ state: 'visible', timeout: 120_000 });
  await page.evaluate(async () => {
    const start = performance.now();
    while (
      !(await indexedDB.databases()).some((db) => db.name === '__baristaDB')
    ) {
      if (performance.now() - start > 120_000) {
        throw new Error('the app did not create its database');
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  });
  const write = async ({ key, json, clear }: Record<string, string>) => {
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
      if (clear === 'yes') {
        store.clear();
      }
      store.put(JSON.parse(json), key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('write failed'));
    });
    db.close();
  };
  let clear = 'yes';
  // One collection per call keeps the messages to the phone small.
  for (const [key, value] of Object.entries(data)) {
    await page.evaluate(write, { key, json: JSON.stringify(value), clear });
    clear = 'no';
  }
}

/** Where the import picks its file; the app may read its own external files directory. */
export const IMPORT_FILE = `/sdcard/Android/data/${APP_ID}/files/device-test/Beanconqueror.zip`;

export async function pushImportFile(localPath: string): Promise<void> {
  await shell(`mkdir -p ${IMPORT_FILE.slice(0, IMPORT_FILE.lastIndexOf('/'))}`);
  await adb('push', localPath, IMPORT_FILE);
}

export interface DeviceWindow extends PerfWindow {
  __device: {
    /** Times at which a transaction that wrote the `BREWS` entry completed. */
    brewWrites: number[];
  };
}

/**
 * Records the performance values of `observePerf` in the running page and replaces the two native
 * dialogs the flows open: the system share sheet after an export (counted like the browser
 * download in `downloadAfterInput`) and the file picker of the import (answered with
 * `IMPORT_FILE`, performance mark `import`). Also records when the `BREWS` entry is written.
 */
export async function instrument(page: Page): Promise<void> {
  await page.evaluate(observePerf);
  await page.evaluate((importFile) => {
    const device: DeviceWindow['__device'] = { brewWrites: [] };
    const win = window as unknown as DeviceWindow & {
      Capacitor: {
        nativePromise: (
          plugin: string,
          method: string,
          options?: unknown,
        ) => Promise<unknown>;
      };
    };
    win.__device = device;
    const cap = win.Capacitor;
    const call = cap.nativePromise.bind(cap);
    cap.nativePromise = (plugin, method, options) => {
      if (plugin === 'Share' && method === 'share') {
        win.__perf.downloads.push(performance.now());
        return Promise.resolve({});
      }
      if (plugin === 'FilePicker' && method === 'pickFiles') {
        performance.mark('import');
        return Promise.resolve({
          files: [
            {
              path: `file://${importFile.replace('/sdcard/', '/storage/emulated/0/')}`,
              name: 'Beanconqueror.zip',
              mimeType: 'application/zip',
            },
          ],
        });
      }
      return call(plugin, method, options);
    };
    // Called with the store as `this` below.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['put']>
    ) {
      const request = put.apply(this, args);
      if (args[1] === 'BREWS') {
        this.transaction.addEventListener('complete', () =>
          device.brewWrites.push(performance.now()),
        );
      }
      return request;
    };
  }, IMPORT_FILE);
}

export interface StartTiming {
  /** Navigation start of the WebView page until the home screen shows the brew count. */
  visible: number;
  /** Until the main thread is also quiet (no long task for one second). */
  settled: number;
  /** From `am start` until the home screen shows the brew count (device clock). */
  fromLaunch: number;
  /** True if the count was already shown when the test connected: then `visible` is too late. */
  shownOnConnect: boolean;
}

/** Waits until an `ion-card-title` reads exactly `text` (the brew count on the home screen). */
export async function waitForStart(
  page: Page,
  text: string,
  launchedAt: number,
): Promise<StartTiming> {
  return page.evaluate(
    async ({ text, launchedAt }) => {
      const perf = (window as unknown as PerfWindow).__perf;
      const shown = () =>
        [...document.querySelectorAll('ion-card-title')].some((element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            (element.textContent ?? '').trim() === text
          );
        });
      const shownOnConnect = shown();
      const waitStart = performance.now();
      while (!shown()) {
        if (performance.now() - waitStart > 300_000) {
          throw new Error(`home screen with ${text} brews not shown`);
        }
        // A page that draws no frames (screen off) must still run into the timeout.
        await Promise.race([perf.nextFrame(), perf.sleep(1_000)]);
      }
      const visible = performance.now();
      const lastEnd = () =>
        perf.longTasks.reduce((latest, task) => Math.max(latest, task.end), 0);
      while (performance.now() - Math.max(visible, lastEnd()) < 1_000) {
        await perf.sleep(100);
      }
      return {
        visible: Math.round(visible),
        settled: Math.round(Math.max(visible, lastEnd())),
        fromLaunch: Math.round(performance.timeOrigin + visible - launchedAt),
        shownOnConnect,
      };
    },
    { text, launchedAt },
  );
}

/**
 * Milliseconds from the last input until the `BREWS` entry was written and until no modal is open
 * any more, and the long tasks until then.
 */
export async function brewSaved(page: Page): Promise<{
  written: number;
  closed: number;
  longTasksTotal: number;
  longestTask: number;
}> {
  return page.evaluate(async () => {
    const win = window as unknown as DeviceWindow;
    const perf = win.__perf;
    const start = perf.lastInput;
    let closed: number | undefined;
    const waitStart = performance.now();
    for (;;) {
      if (
        closed === undefined &&
        document.querySelector('ion-modal') === null
      ) {
        closed = performance.now();
      }
      const written = win.__device.brewWrites.find((time) => time >= start);
      if (closed !== undefined && written !== undefined) {
        const end = Math.max(closed, written);
        const tasks = perf.longTasks
          .filter((t) => t.end > start && t.start < end)
          .map((t) => Math.min(t.end, end) - Math.max(t.start, start));
        return {
          written: Math.round(written - start),
          closed: Math.round(closed - start),
          longTasksTotal: Math.round(tasks.reduce((sum, t) => sum + t, 0)),
          longestTask: Math.round(Math.max(0, ...tasks)),
        };
      }
      if (performance.now() - waitStart > 300_000) {
        throw new Error('brew not saved');
      }
      await perf.nextFrame();
    }
  });
}

/**
 * Leaves a text field and waits until the on-screen keyboard is gone. A tap while it closes can
 * miss its target, because the page moves back.
 */
export async function leaveTextField(page: Page): Promise<void> {
  await page.evaluate(() =>
    (document.activeElement as HTMLElement | null)?.blur(),
  );
  await poll('closed keyboard', async () =>
    (await shell('dumpsys input_method')).includes('mInputShown=true')
      ? undefined
      : true,
  );
  // The page needs a moment to take the space back.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 500)));
}

/** Proportional set size in KiB of a process, from `dumpsys meminfo`. */
async function pss(process: string | number): Promise<number | undefined> {
  const out = await shell(`dumpsys meminfo ${process}`);
  const match =
    /TOTAL PSS:\s+(\d+)/.exec(out) ?? /^\s*TOTAL\s+(\d+)/m.exec(out);
  return match ? Number(match[1]) : undefined;
}

/** Package of the WebView implementation the phone uses, e.g. `com.google.android.webview`. */
async function webViewPackage(): Promise<string | undefined> {
  const out = await shell('dumpsys webviewupdate');
  return /Current WebView package \(name, version\): \(([^,]+),/.exec(out)?.[1];
}

/**
 * PID of the app's WebView renderer: the isolated `sandboxed_process` of the WebView package that
 * runs a `SandboxedProcessService` started by the app. Renderers of other apps that use the same
 * WebView (or Chrome) have the same process name, so the name alone is not enough.
 */
async function rendererPid(): Promise<number | undefined> {
  const webView = await webViewPackage();
  if (webView === undefined) {
    return undefined;
  }
  const services = await shell(`dumpsys activity services ${APP_ID}`);
  const pids = new Set<number>();
  // `app=ProcessRecord{1a2b3c 5299:com.google.android.webview:sandboxed_process0:…/u0a268i268}`
  for (const [, pid, name] of services.matchAll(
    /^\s*app=ProcessRecord\{\S+ (\d+):([^/\s]+)\//gm,
  )) {
    if (name.startsWith(`${webView}:sandboxed_process`)) {
      pids.add(Number(pid));
    }
  }
  // One renderer per app with WebView's default; with several, none of them is "the" one.
  return pids.size === 1 ? [...pids][0] : undefined;
}

/**
 * Memory of the app process and of its WebView renderer (a separate process), in KiB, plus the
 * JavaScript heap.
 */
export async function memory(app: RunningApp): Promise<{
  appPssKiB?: number;
  rendererPssKiB?: number;
  jsHeapUsedKiB: number;
}> {
  const renderer = await rendererPid();
  const session = await app.page.context().newCDPSession(app.page);
  const heap = (await session.send('Runtime.getHeapUsage')) as {
    usedSize: number;
  };
  await session.detach();
  return {
    appPssKiB: await pss(APP_ID),
    rendererPssKiB: renderer === undefined ? undefined : await pss(renderer),
    jsHeapUsedKiB: Math.round(heap.usedSize / 1024),
  };
}

/**
 * Sizes in KiB of the WebView's IndexedDB directory (large entries such as the brews are files
 * of their own in it) and of all of the app's private data. Debug builds allow `run-as`.
 */
export async function storageKiB(): Promise<{
  databaseKiB: number;
  appDataKiB: number;
}> {
  const sizes = (
    await shell(`run-as ${APP_ID} du -sk app_webview/Default/IndexedDB .`)
  )
    .trim()
    .split('\n')
    .map((line) => Number(line.trim().split(/\s+/)[0]));
  return { databaseKiB: sizes[0], appDataKiB: sizes[1] };
}

/** Prints one measurement as a `DEVICE {…}` line; collect them with `grep '^DEVICE'`. */
export function report(
  brews: number,
  run: number,
  name: string,
  values: Record<string, number | boolean | undefined>,
): void {
  console.log(`DEVICE ${JSON.stringify({ brews, run, name, ...values })}`);
}
