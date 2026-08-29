import moment from 'moment';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../../enums/settings/statisticBeanDateField';
import {
  filterBeansByRange,
  filterByConfigTimestamp,
  getDefaultStatisticDateRange,
  IStatisticDateRange,
  isUnixInRange,
  resolveBeanRangeDate,
  resolveQuickRange,
} from '../statistic-date-range';

function brewAt(unixSeconds: number): Brew {
  const brew = new Brew();
  brew.config.unix_timestamp = unixSeconds;
  return brew;
}

describe('statistic-date-range', () => {
  // 2024-06-15 12:00:00 UTC as a stable "now".
  const nowUnix = moment.utc('2024-06-15T12:00:00Z').unix();

  describe('getDefaultStatisticDateRange', () => {
    it('defaults to ALL with open bounds', () => {
      expect(getDefaultStatisticDateRange()).toEqual({
        mode: 'ALL',
        start: null,
        end: null,
      });
    });
  });

  describe('resolveQuickRange', () => {
    it('ALL and CUSTOM produce open bounds', () => {
      expect(resolveQuickRange('ALL', nowUnix).start).toBeNull();
      expect(resolveQuickRange('ALL', nowUnix).end).toBeNull();
      expect(resolveQuickRange('CUSTOM', nowUnix).start).toBeNull();
    });

    it('THIS_MONTH spans start..end of the current month', () => {
      const range = resolveQuickRange('THIS_MONTH', nowUnix);
      expect(
        moment.unix(range.start).isSame(moment.unix(nowUnix), 'month'),
      ).toBe(true);
      expect(range.start).toBe(moment.unix(nowUnix).startOf('month').unix());
      expect(range.end).toBe(moment.unix(nowUnix).endOf('month').unix());
    });

    it('LAST_MONTH spans the previous month', () => {
      const range = resolveQuickRange('LAST_MONTH', nowUnix);
      const lastMonth = moment.unix(nowUnix).subtract(1, 'month');
      expect(range.start).toBe(lastMonth.clone().startOf('month').unix());
      expect(range.end).toBe(lastMonth.clone().endOf('month').unix());
    });

    it('THIS_YEAR spans start..end of the current year', () => {
      const range = resolveQuickRange('THIS_YEAR', nowUnix);
      expect(range.start).toBe(moment.unix(nowUnix).startOf('year').unix());
      expect(range.end).toBe(moment.unix(nowUnix).endOf('year').unix());
    });
  });

  describe('isUnixInRange', () => {
    const range: IStatisticDateRange = { mode: 'CUSTOM', start: 100, end: 200 };

    it('includes the inclusive boundaries', () => {
      expect(isUnixInRange(100, range)).toBe(true);
      expect(isUnixInRange(200, range)).toBe(true);
    });

    it('excludes values outside the bounds', () => {
      expect(isUnixInRange(99, range)).toBe(false);
      expect(isUnixInRange(201, range)).toBe(false);
    });

    it('treats null bounds as open-ended', () => {
      expect(isUnixInRange(5, { mode: 'CUSTOM', start: null, end: 200 })).toBe(
        true,
      );
      expect(
        isUnixInRange(5000, { mode: 'CUSTOM', start: 100, end: null }),
      ).toBe(true);
    });
  });

  describe('filterByConfigTimestamp', () => {
    const brews = [brewAt(50), brewAt(150), brewAt(250)];

    it('returns all entries when mode is ALL', () => {
      const range: IStatisticDateRange = { mode: 'ALL', start: 100, end: 200 };
      expect(filterByConfigTimestamp(brews, range).length).toBe(3);
    });

    it('filters by config.unix_timestamp for a bounded range', () => {
      const range: IStatisticDateRange = {
        mode: 'CUSTOM',
        start: 100,
        end: 200,
      };
      const result = filterByConfigTimestamp(brews, range);
      expect(result.length).toBe(1);
      expect(result[0].config.unix_timestamp).toBe(150);
    });
  });

  describe('resolveBeanRangeDate', () => {
    it('uses config.unix_timestamp for ADDED', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.roastingDate = moment.unix(nowUnix).format();
      expect(
        resolveBeanRangeDate(bean, STATISTIC_BEAN_DATE_FIELD_ENUM.ADDED),
      ).toBe(4242);
    });

    it('uses the ISO field when populated', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.roastingDate = moment.unix(nowUnix).format();
      expect(
        resolveBeanRangeDate(bean, STATISTIC_BEAN_DATE_FIELD_ENUM.ROAST),
      ).toBe(nowUnix);
    });

    it('uses openDate for OPEN when populated', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.openDate = moment.unix(nowUnix).format();
      expect(
        resolveBeanRangeDate(bean, STATISTIC_BEAN_DATE_FIELD_ENUM.OPEN),
      ).toBe(nowUnix);
    });

    it('falls back to config.unix_timestamp when the chosen field is empty', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.buyDate = '';
      expect(
        resolveBeanRangeDate(bean, STATISTIC_BEAN_DATE_FIELD_ENUM.BUY),
      ).toBe(4242);
    });

    it('falls back to config.unix_timestamp when the chosen field is an invalid date', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.roastingDate = 'not-a-date';
      expect(
        resolveBeanRangeDate(bean, STATISTIC_BEAN_DATE_FIELD_ENUM.ROAST),
      ).toBe(4242);
    });
  });

  describe('filterBeansByRange', () => {
    it('filters beans by the resolved date field', () => {
      const inBean = new Bean();
      inBean.config.unix_timestamp = 4242;
      inBean.buyDate = moment.unix(nowUnix).format();
      const outBean = new Bean();
      outBean.config.unix_timestamp = 4242;
      outBean.buyDate = moment.unix(nowUnix).subtract(2, 'year').format();

      const range = resolveQuickRange('THIS_YEAR', nowUnix);
      const result = filterBeansByRange(
        [inBean, outBean],
        range,
        STATISTIC_BEAN_DATE_FIELD_ENUM.BUY,
      );
      expect(result.length).toBe(1);
      expect(result[0]).toBe(inBean);
    });

    it('returns all beans when mode is ALL, ignoring bounds', () => {
      const bean = new Bean();
      bean.config.unix_timestamp = 4242;
      bean.buyDate = moment.unix(nowUnix).subtract(5, 'year').format();
      const result = filterBeansByRange(
        [bean],
        { mode: 'ALL', start: nowUnix, end: nowUnix },
        STATISTIC_BEAN_DATE_FIELD_ENUM.BUY,
      );
      expect(result.length).toBe(1);
    });
  });
});
