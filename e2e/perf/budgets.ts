export type PerfTier = 7_000 | 15_000 | 30_000;

/**
 * Upper limits in milliseconds at 4x CPU throttling (see DEVELOPING.md, "Performance budgets").
 *
 * Set from sixteen runs on an Apple M2 Max (2026-11-13). Only tests that started with the machine
 * at most 30 % busy count (in the last three runs also after the measurement; `BUSY_LIMIT` in
 * perf.ts), five to thirteen values per budget; the comments give their median / maximum. Each
 * budget is that maximum plus 30 %, but at least plus 50 ms, rounded up to 10 ms (100 ms from one
 * second, 1,000 ms from ten seconds), so the spread between runs passes and a clear slowdown
 * fails. A budget is never below the one for fewer brews: the work grows with the brews.
 * Lower a budget when the app gets faster; raise one only with a reason.
 *
 * The values are from before entries carried change info and before the brew charts were
 * measured until their painting ends (about 50 ms later than the last long task). Four runs
 * after both changes (2026-11-13) stayed within every budget although the machine was 39 to
 * 99 % busy, so no budget was changed; the brew charts used up to 90 % of theirs. Derive the
 * budgets again when the machine is idle.
 *
 * The 30,000-brew budgets are from six runs on the same machine (2026-11-15), three to six
 * values per budget by the same rule.
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
   * The "Brews" segment until all of its charts are painted, nothing paints on them any more and
   * the main thread is quiet, after the delay before drawing.
   */
  statisticsBrewCharts: number;
  /**
   * Settings > Export, from the tap until the app hands the ZIP to the browser, without the delay
   * before the download.
   */
  export: number;
  /**
   * Settings > Import, from the moment the app gets the file until "Import successful" shows,
   * without the time the question whether to replace all data is open.
   */
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
    startVisible: 3_900, // 2,438 / 2,926
    startInteractive: 4_000, // 2,541 / 3,044
    brewListOpen: 510, // 376 / 389
    brewListScroll: 31_000, // 20,853 / 23,169
    brewListScrollLongestFrame: 200, // 112 / 145
    search: 170, // 90 / 112
    beanListOpen: 640, // 414 / 488
    statisticsOpen: 140, // 74 / 81
    statisticsBrewCharts: 330, // 228 / 250
    export: 1_000, // 748 / 763
    import: 2_000, // 1,138 / 1,515
  },
  15_000: {
    startVisible: 3_900, // 2,752 / 2,904
    startInteractive: 4_000, // 2,855 / 3,011
    brewListOpen: 810, // 555 / 622
    brewListScroll: 69_000, // 47,632 / 52,320
    brewListScrollLongestFrame: 300, // 179 / 224
    search: 200, // 118 / 146
    beanListOpen: 640, // 414 / 432
    statisticsOpen: 160, // 85 / 101
    statisticsBrewCharts: 450, // 320 / 340
    export: 1_900, // 1,364 / 1,395
    import: 3_600, // 1,892 / 2,716 (once; otherwise at most 2,028)
  },
  30_000: {
    startVisible: 3_900, // 1,998 / 2,007
    startInteractive: 4_000, // 2,116 / 2,129
    brewListOpen: 810, // 272 / 306
    brewListScroll: 126_000, // 87,800 / 96,607
    brewListScrollLongestFrame: 300, // 168 / 210
    search: 200, // 111 / 116
    beanListOpen: 680, // 459 / 519
    statisticsOpen: 210, // 112 / 154
    statisticsBrewCharts: 710, // 531 / 541
    export: 2_300, // 1,588 / 1,760
    import: 5_300, // 3,420 / 4,009
  },
};
