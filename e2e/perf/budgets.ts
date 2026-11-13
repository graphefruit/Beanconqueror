export type PerfTier = 7_000 | 15_000;

/**
 * Upper limits in milliseconds at 4x CPU throttling (see DEVELOPING.md, "Performance budgets").
 *
 * Set from ten runs on an Apple M2 Max (2026-11-13). Only tests that started with the machine at
 * most 30 % busy count (`BUSY_LIMIT` in perf.ts), four to seven values per budget; the comments
 * give their median / maximum. Each budget is that maximum plus 30 %, but at least plus 50 ms,
 * rounded up to 10 ms (100 ms from one second, 1,000 ms from ten seconds), so the spread between
 * runs passes and a clear slowdown fails. A 15,000-brew budget is never below the 7,000-brew one:
 * the work grows with the brews. Lower a budget when the app gets faster; raise one only with a
 * reason.
 */
export interface Budget {
  /** Navigation start until the home screen shows the brew count. */
  startVisible: number;
  /** Until the main thread is also quiet (no long task for one second). */
  startInteractive: number;
  /** Brews tab until the newest brew is shown and the main thread is quiet. */
  brewListOpen: number;
  /** Scrolling the current brews to the oldest one, three screens per frame. */
  brewListScroll: number;
  brewListScrollLongestFrame: number;
  /** Search in the brew list until the list shows the matches, after the field's debounce. */
  search: number;
  beanListOpen: number;
  /** Profile > Statistics until the general numbers are shown and the main thread is quiet. */
  statisticsOpen: number;
  /**
   * The "Brews" segment until its charts are drawn and the main thread is quiet, after the
   * delay before drawing.
   */
  statisticsBrewCharts: number;
  /**
   * Settings > Export, from the tap until the app hands the ZIP to the browser, without the delay
   * before the download.
   */
  export: number;
  /** Settings > Import, from the moment the app gets the file until "Import successful" shows. */
  import: number;
}

/**
 * Fixed waits of the app inside a measured flow, in milliseconds. They are taken off a value
 * before it is compared with its budget, so a budget and its reserve cover the app's work only.
 */
export const FIXED_DELAYS = {
  /** `debounce="750"` of the brew list's search field (src/app/brew/brew.page.html). */
  search: 750,
  /** `setTimeout(…, 250)` in `StatisticPage.loadBrewCharts()`. */
  statisticsBrewCharts: 250,
  /** `setTimeout(…, 250)` in `UIFileHelper.exportFileInBrowser()`. */
  export: 250,
} as const satisfies Partial<Record<keyof Budget, number>>;

export const BUDGETS: Record<PerfTier, Budget> = {
  7_000: {
    startVisible: 3_900, // 2,494 / 2,926
    startInteractive: 4_000, // 2,598 / 3,044
    brewListOpen: 510, // 369 / 387
    brewListScroll: 31_000, // 20,672 / 23,169
    brewListScrollLongestFrame: 200, // 113 / 145
    search: 170, // 90 / 112
    beanListOpen: 600, // 412 / 455
    statisticsOpen: 130, // 74 / 77
    statisticsBrewCharts: 310, // 222 / 234
    export: 1_000, // 746 / 763
    import: 2_000, // 1,106 / 1,515
  },
  15_000: {
    startVisible: 3_900, // 2,748 / 2,904
    startInteractive: 4_000, // 2,852 / 3,011
    brewListOpen: 810, // 536 / 622
    brewListScroll: 69_000, // 47,632 / 52,320
    brewListScrollLongestFrame: 270, // 179 / 204
    search: 200, // 116 / 146
    beanListOpen: 600, // 421 / 432
    statisticsOpen: 150, // 86 / 100
    statisticsBrewCharts: 450, // 314 / 339
    export: 1_900, // 1,364 / 1,385
    import: 2_700, // 1,892 / 2,028
  },
};
