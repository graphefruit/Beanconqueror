package com.beanconqueror;

/** What the widget shows of a snapshot; free of Android, so that it can be tested. */
record BrewWidgetCounts(int today, int week, int beans, Long lastBrewAt, Long refreshAt) {

  /**
   * The counts at {@code nowSeconds}, or null for a snapshot of another form, which the widget
   * shows as empty. Times are unix seconds; {@code lastBrewAt} is null when nothing was brewed,
   * {@code refreshAt} is the next end of the day or week, null when both are over.
   */
  static BrewWidgetCounts at(int version, int brewsToday, long todayEndsAt, int brewsThisWeek,
                             long weekEndsAt, int openBeans, Long lastBrewAt, long nowSeconds) {
    if (version != 1) {
      return null;
    }
    // A day or week that is over has no brews yet: every brew is saved in the app, which then
    // writes a new snapshot. The week always ends at the end of a day.
    Long refreshAt = nowSeconds < todayEndsAt ? Long.valueOf(todayEndsAt)
      : nowSeconds < weekEndsAt ? Long.valueOf(weekEndsAt) : null;
    return new BrewWidgetCounts(
      nowSeconds < todayEndsAt ? brewsToday : 0,
      nowSeconds < weekEndsAt ? brewsThisWeek : 0,
      openBeans,
      lastBrewAt,
      refreshAt);
  }
}
