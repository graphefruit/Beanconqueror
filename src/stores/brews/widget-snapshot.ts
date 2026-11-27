import moment from 'moment';

import { IBean } from '../../interfaces/bean/iBean';
import { isFrozen } from '../beans/bean-rules';
import { field } from '../beans/bean-usage.store';

/**
 * What the home screen widgets show. Only counts and the time of the last
 * brew: the snapshot lies outside the app's data, in storage the widgets can
 * read, and is part of the device backups. Times are unix seconds.
 */
export interface WidgetSnapshot {
  readonly v: 1;
  readonly brewsToday: number;
  /** `brewsToday` counts as 0 from this time on. */
  readonly todayEndsAt: number;
  /** Brews of the week from Monday on. */
  readonly brewsThisWeek: number;
  readonly weekEndsAt: number;
  /** Beans neither archived nor frozen, as in the "open" list. */
  readonly openBeans: number;
  /** The newest brew up to the time of the snapshot. */
  readonly lastBrewAt: number | null;
}

/**
 * The snapshot at `now` (milliseconds), in one pass over the stored brews
 * and beans. Days and weeks are local.
 */
export function buildWidgetSnapshot(
  storedBrews: readonly unknown[],
  storedBeans: readonly unknown[],
  now: number,
): WidgetSnapshot {
  const today = moment(now).startOf('day');
  const todayStart = today.unix();
  const todayEnd = today.add(1, 'day').unix();
  const week = moment(now).startOf('isoWeek');
  const weekStart = week.unix();
  const weekEnd = week.add(1, 'week').unix();
  let brewsToday = 0;
  let brewsThisWeek = 0;
  const nowSeconds = Math.floor(now / 1000);
  let lastBrewAt: number | null = null;
  for (const entry of storedBrews) {
    const config = field(entry as Record<string, unknown>, 'config', null) as {
      unix_timestamp?: unknown;
    } | null;
    const at = config?.unix_timestamp;
    if (typeof at !== 'number' || !Number.isFinite(at)) {
      continue;
    }
    if (at >= todayStart && at < todayEnd) {
      brewsToday++;
    }
    if (at >= weekStart && at < weekEnd) {
      brewsThisWeek++;
    }
    // The widgets show the last brew as "x ago", which a brew dated ahead
    // cannot be.
    if (at <= nowSeconds && (lastBrewAt === null || at > lastBrewAt)) {
      lastBrewAt = at;
    }
  }
  let openBeans = 0;
  for (const entry of storedBeans) {
    // Beans of older versions may miss these fields; a missing one counts
    // as not set.
    const bean = entry as Pick<
      IBean,
      'finished' | 'frozenDate' | 'unfrozenDate'
    >;
    if (!bean.finished && !isFrozen(bean)) {
      openBeans++;
    }
  }
  return {
    v: 1,
    brewsToday,
    todayEndsAt: todayEnd,
    brewsThisWeek,
    weekEndsAt: weekEnd,
    openBeans,
    lastBrewAt,
  };
}
