import { execFile, spawn } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { chromium, type Browser, type Page } from '@playwright/test';

import { observePerf, type PerfWindow } from '../perf/perf';

/**
 * Drives the debug or the release build of the app on an Android phone over ADB (see
 * DEVELOPING.md, "Device tests"). Playwright connects to the app's WebView through the Chrome
 * DevTools Protocol: with WebView debugging on (debug builds, and the release build made for these
 * measurements) the app opens the socket `webview_devtools_remote_<pid>`, which `adb forward` makes
 * a local port. Only the package below is installed, started, stopped and cleared.
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

/** Removes the app with its data; no error if it is not installed. */
export async function uninstallApp(): Promise<void> {
  await adb('uninstall', APP_ID).catch(() => undefined);
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

/** Fails if the lock screen shows; nothing here gets past it. */
async function assertUnlocked(): Promise<void> {
  // While the lock screen shows, the app's activity is not shown (the app does not set
  // `showWhenLocked`) and its WebView draws no frames, so every measurement would hang. The page
  // cannot tell: its visibilityState stays "visible".
  if ((await shell('dumpsys window')).includes('isKeyguardShowing=true')) {
    throw new Error(
      'The lock screen shows: unlock the phone and keep the screen on.',
    );
  }
}

/**
 * Cold start: stops the app (its caches stay), wakes the screen and starts the activity, then
 * connects to the WebView as soon as its DevTools socket is there. The page usually still loads
 * then; times are taken from the page's own clock, so the connection does not count.
 *
 * To disturb the start as little as possible, the lock screen is checked before it, and the wait
 * for the app process and the socket runs on the phone in one shell (`pidof` and a look into
 * `/proc/net/unix` every 50 ms) instead of one ADB call per check.
 */
export async function coldStart(): Promise<RunningApp> {
  await stopApp();
  await shell('input keyevent KEYCODE_WAKEUP');
  await assertUnlocked();
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
  const { stdout } = await run(
    ADB,
    [
      'shell',
      `until p=$(pidof ${APP_ID}); do sleep 0.05; done; echo $p; ` +
        `until grep -q "@webview_devtools_remote_\${p%% *}" /proc/net/unix; do sleep 0.05; done`,
    ],
    { timeout: 60_000 },
  ).catch(() => {
    throw new Error('App process or WebView DevTools socket not found');
  });
  const pid = Number(stdout.trim().split(/\s+/)[0]);
  const socket = `webview_devtools_remote_${pid}`;
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

/** Waits until a `.card-title-text` reads exactly `text` (the brew count on the home screen). */
export async function waitForStart(
  page: Page,
  text: string,
  launchedAt: number,
): Promise<StartTiming> {
  return page.evaluate(
    async ({ text, launchedAt }) => {
      const perf = (window as unknown as PerfWindow).__perf;
      const shown = () =>
        [...document.querySelectorAll('.card-title-text')].some((element) => {
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
 * JavaScript heap as it is and after a garbage collection (`HeapProfiler.collectGarbage`). The
 * process sizes are read before the collection. The collection also changes what comes next: the
 * following step starts with a clean heap.
 */
export async function memory(app: RunningApp): Promise<{
  appPssKiB?: number;
  rendererPssKiB?: number;
  jsHeapUsedKiB: number;
  jsHeapAfterGcKiB: number;
}> {
  const renderer = await rendererPid();
  const appPssKiB = await pss(APP_ID);
  const rendererPssKiB =
    renderer === undefined ? undefined : await pss(renderer);
  const session = await app.page.context().newCDPSession(app.page);
  const heapUsed = async () =>
    (
      (await session.send('Runtime.getHeapUsage')) as {
        usedSize: number;
      }
    ).usedSize;
  const before = await heapUsed();
  await session.send('HeapProfiler.collectGarbage');
  const after = await heapUsed();
  await session.detach();
  return {
    appPssKiB,
    rendererPssKiB,
    jsHeapUsedKiB: Math.round(before / 1024),
    jsHeapAfterGcKiB: Math.round(after / 1024),
  };
}

/**
 * Sizes in KiB of the WebView's IndexedDB directory (large entries such as the brews are files
 * of their own in it) and of all of the app's private data. Only debug builds allow `run-as`; the
 * release build leaves both out. `originUsageKiB` is what the WebView itself reports for the
 * app's origin (`navigator.storage.estimate()`), in both builds.
 */
export async function storageKiB(page: Page): Promise<{
  databaseKiB?: number;
  appDataKiB?: number;
  originUsageKiB?: number;
}> {
  const sizes = (
    await shell(
      `run-as ${APP_ID} du -sk app_webview/Default/IndexedDB .`,
    ).catch(() => '')
  )
    .trim()
    .split('\n')
    .filter((line) => /^\d+\s/.test(line))
    .map((line) => Number(line.trim().split(/\s+/)[0]));
  const usage = await page.evaluate(
    async () => (await navigator.storage.estimate()).usage,
  );
  return {
    databaseKiB: sizes.length === 2 ? sizes[0] : undefined,
    appDataKiB: sizes.length === 2 ? sizes[1] : undefined,
    originUsageKiB: usage === undefined ? undefined : Math.round(usage / 1024),
  };
}

/** Thermal status (0 = none … 6 = shutdown) and temperatures of the phone, in °C. */
export async function thermal(): Promise<{
  thermalStatus?: number;
  batteryTempC?: number;
  skinTempC?: number;
}> {
  const service = await shell('dumpsys thermalservice');
  const battery = await shell('dumpsys battery');
  const status = /Thermal Status: (\d+)/.exec(service);
  const batteryTemp = /temperature: (\d+)/.exec(battery);
  // The current values from the HAL, not the cached ones; type 3 is the skin (board) sensor.
  const current = service.split('Current temperatures from HAL:')[1] ?? '';
  const skin = /mValue=([\d.]+), mType=3,/.exec(current);
  return {
    thermalStatus: status ? Number(status[1]) : undefined,
    batteryTempC: batteryTemp ? Number(batteryTemp[1]) / 10 : undefined,
    skinTempC: skin ? Number(skin[1]) : undefined,
  };
}

/** The build of the app (DEVELOPING.md, "Device tests"). */
export type Build = 'debug' | 'release';

/** APK of each build; `DEVICE_APK_DEBUG` and `DEVICE_APK_RELEASE` point to other files. */
export const APKS: Record<Build, string> = {
  debug:
    process.env.DEVICE_APK_DEBUG ??
    'android/app/build/outputs/apk/debug/app-debug.apk',
  release:
    process.env.DEVICE_APK_RELEASE ??
    'android/app/build/outputs/apk/measure/app-measure.apk',
};

/** One measured run: the build, the data set and the run (0 is the warm-up run). */
export interface Series {
  build: Build;
  brews: number;
  run: number;
}

/**
 * Prints one measurement as a `DEVICE {…}` line; collect them with `grep '^DEVICE'`. Lines of
 * the warm-up run carry `warmup: true` and are left out of the evaluation.
 */
export function report(
  series: Series,
  name: string,
  values: Record<string, number | boolean | undefined>,
): void {
  console.log(
    `DEVICE ${JSON.stringify({
      ...series,
      ...(series.run === 0 ? { warmup: true } : {}),
      name,
      ...values,
    })}`,
  );
}
