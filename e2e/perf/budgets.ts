export type PerfTier = 7_000 | 15_000;

/**
 * Upper limits in milliseconds at 4x CPU throttling (see DEVELOPING.md, "Performance budgets").
 *
 * Set from five runs on an Apple M2 Max (2026-11). The comments give median / maximum of those
 * runs; each budget is the maximum plus about 30 % (at least 150 ms for short values), so the
 * spread between runs passes and a clear slowdown fails. Lower a budget when the app gets
 * faster; raise one only with a reason.
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
  /** Search in the brew list, including the field's 750 ms debounce. */
  search: number;
  beanListOpen: number;
  /** Profile > Statistics until the general numbers are shown and the main thread is quiet. */
  statisticsOpen: number;
  /** The "Brews" segment until its charts are drawn and the main thread is quiet. */
  statisticsBrewCharts: number;
  /** Settings > Export, from the tap until the app hands the ZIP to the browser. */
  export: number;
  /** Settings > Import, from the moment the app gets the file until "Import successful" shows. */
  import: number;
}

export const BUDGETS: Record<PerfTier, Budget> = {
  7_000: {
    startVisible: 3_500, // 2,560 / 2,692
    startInteractive: 3_600, // 2,666 / 2,799
    brewListOpen: 600, // 401 / 422
    brewListScroll: 31_000, // 22,218 / 23,791
    brewListScrollLongestFrame: 200, // 127 / 132
    search: 1_150, // 839 / 871
    beanListOpen: 700, // 419 / 519
    statisticsOpen: 250, // 75 / 80
    statisticsBrewCharts: 650, // 482 / 490
    export: 2_300, // 1,720 / 1,753
    import: 2_600, // 1,935 / 1,972
  },
  15_000: {
    startVisible: 3_900, // 2,872 / 2,968
    startInteractive: 4_000, // 2,980 / 3,079
    brewListOpen: 750, // 555 / 556
    brewListScroll: 69_000, // 46,793 / 53,005
    brewListScrollLongestFrame: 300, // 226 / 231
    search: 1_150, // 870 / 870
    beanListOpen: 600, // 424 / 444
    statisticsOpen: 270, // 87 / 120
    statisticsBrewCharts: 800, // 573 / 599
    export: 3_100, // 2,345 / 2,396
    import: 3_500, // 2,607 / 2,705
  },
};
