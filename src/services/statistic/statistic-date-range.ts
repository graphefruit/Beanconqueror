import moment from 'moment';

import { Bean } from '../../classes/bean/bean';
import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../enums/settings/statisticBeanDateField';

export type STATISTIC_RANGE_MODE =
  | 'ALL'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface IStatisticDateRange {
  mode: STATISTIC_RANGE_MODE;
  // Inclusive unix-second bounds; null means open-ended on that side.
  start: number | null;
  end: number | null;
}

export function getDefaultStatisticDateRange(): IStatisticDateRange {
  return { mode: 'ALL', start: null, end: null };
}

// nowUnix is injected (unix seconds) so the resolver stays pure/testable.
export function resolveQuickRange(
  mode: STATISTIC_RANGE_MODE,
  nowUnix: number,
): IStatisticDateRange {
  const now = moment.unix(nowUnix);
  switch (mode) {
    case 'THIS_MONTH':
      return {
        mode,
        start: now.clone().startOf('month').unix(),
        end: now.clone().endOf('month').unix(),
      };
    case 'LAST_MONTH': {
      const lastMonth = now.clone().subtract(1, 'month');
      return {
        mode,
        start: lastMonth.clone().startOf('month').unix(),
        end: lastMonth.clone().endOf('month').unix(),
      };
    }
    case 'THIS_YEAR':
      return {
        mode,
        start: now.clone().startOf('year').unix(),
        end: now.clone().endOf('year').unix(),
      };
    default:
      // ALL and CUSTOM start open; CUSTOM bounds are filled in by the UI.
      return { mode, start: null, end: null };
  }
}

export function isUnixInRange(
  unixSeconds: number,
  range: IStatisticDateRange,
): boolean {
  if (range.start !== null && unixSeconds < range.start) {
    return false;
  }
  if (range.end !== null && unixSeconds > range.end) {
    return false;
  }
  return true;
}

export function filterByConfigTimestamp<
  T extends { config: { unix_timestamp: number } },
>(entries: Array<T>, range: IStatisticDateRange): Array<T> {
  if (range.mode === 'ALL') {
    return entries;
  }
  return entries.filter((entry) =>
    isUnixInRange(entry.config.unix_timestamp, range),
  );
}

// Resolve the unix-second date used to place a bean on the timeline,
// honoring the user's chosen field with fallback to the added date.
export function resolveBeanRangeDate(
  bean: Bean,
  field: STATISTIC_BEAN_DATE_FIELD_ENUM,
): number {
  let isoField = '';
  if (field === STATISTIC_BEAN_DATE_FIELD_ENUM.ROAST) {
    isoField = bean.roastingDate;
  } else if (field === STATISTIC_BEAN_DATE_FIELD_ENUM.BUY) {
    isoField = bean.buyDate;
  } else if (field === STATISTIC_BEAN_DATE_FIELD_ENUM.OPEN) {
    isoField = bean.openDate;
  }

  if (isoField) {
    const parsed = moment(isoField);
    if (parsed.isValid()) {
      return parsed.unix();
    }
  }
  // ADDED, or fallback when the chosen field is empty/invalid.
  return bean.config.unix_timestamp;
}

export function filterBeansByRange(
  beans: Array<Bean>,
  range: IStatisticDateRange,
  field: STATISTIC_BEAN_DATE_FIELD_ENUM,
): Array<Bean> {
  if (range.mode === 'ALL') {
    return beans;
  }
  return beans.filter((bean) =>
    isUnixInRange(resolveBeanRangeDate(bean, field), range),
  );
}
