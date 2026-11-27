import moment from 'moment';

import { buildWidgetSnapshot } from '../widget-snapshot';

/** Wednesday 2026-11-18, 10:30 local time. */
const NOW = moment('2026-11-18 10:30', 'YYYY-MM-DD HH:mm').valueOf();

function brewAt(local: string): object {
  return {
    config: {
      uuid: local,
      unix_timestamp: moment(local, 'YYYY-MM-DD HH:mm').unix(),
    },
  };
}

describe('buildWidgetSnapshot', () => {
  it('has no brews and no beans for empty collections', () => {
    expect(buildWidgetSnapshot([], [], NOW)).toEqual({
      v: 1,
      brewsToday: 0,
      todayEndsAt: moment('2026-11-19', 'YYYY-MM-DD').unix(),
      brewsThisWeek: 0,
      weekEndsAt: moment('2026-11-23', 'YYYY-MM-DD').unix(),
      openBeans: 0,
      lastBrewAt: null,
    });
  });

  it('counts the brews of the local day and of the week from Monday', () => {
    const brews = [
      brewAt('2026-11-18 00:00'),
      brewAt('2026-11-18 09:59'),
      brewAt('2026-11-17 23:59'),
      brewAt('2026-11-16 00:00'),
      brewAt('2026-11-15 23:59'),
      brewAt('2026-10-01 08:00'),
    ];

    const snapshot = buildWidgetSnapshot(brews, [], NOW);

    expect(snapshot.brewsToday).toBe(2);
    expect(snapshot.brewsThisWeek).toBe(4);
    expect(snapshot.lastBrewAt).toBe(
      moment('2026-11-18 09:59', 'YYYY-MM-DD HH:mm').unix(),
    );
  });

  // A brew dated ahead still belongs to its day, but the widgets show the
  // last brew as "x ago", so it cannot be the last one.
  it('counts a brew dated later today but takes the newest past one as the last brew', () => {
    const later = brewAt('2026-11-18 23:00');
    const snapshot = buildWidgetSnapshot(
      [brewAt('2026-11-18 08:00'), later],
      [],
      NOW,
    );

    expect(snapshot.brewsToday).toBe(2);
    expect(snapshot.lastBrewAt).toBe(
      moment('2026-11-18 08:00', 'YYYY-MM-DD HH:mm').unix(),
    );
  });

  it('takes a brew at this very moment as the last brew', () => {
    const snapshot = buildWidgetSnapshot([brewAt('2026-11-18 10:30')], [], NOW);

    expect(snapshot.lastBrewAt).toBe(Math.floor(NOW / 1000));
  });

  it('has no last brew when every brew is dated ahead', () => {
    const snapshot = buildWidgetSnapshot([brewAt('2026-11-19 08:00')], [], NOW);

    expect(snapshot.lastBrewAt).toBeNull();
  });

  it('skips stored brews without a usable time', () => {
    const brews = [
      {},
      { config: null },
      { config: { uuid: 'a' } },
      { config: { unix_timestamp: 'today' } },
      { config: { unix_timestamp: Number.NaN } },
      brewAt('2026-11-18 08:00'),
    ];

    const snapshot = buildWidgetSnapshot(brews, [], NOW);

    expect(snapshot.brewsToday).toBe(1);
    expect(snapshot.brewsThisWeek).toBe(1);
  });

  it('counts the beans that are neither archived nor frozen', () => {
    const beans = [
      { finished: false, frozenDate: '', unfrozenDate: '' },
      { finished: false, frozenDate: '2026-10-01', unfrozenDate: '' },
      {
        finished: false,
        frozenDate: '2026-10-01',
        unfrozenDate: '2026-11-01',
      },
      { finished: true, frozenDate: '', unfrozenDate: '' },
      // Fields missing, as in beans of older versions.
      {},
    ];

    expect(buildWidgetSnapshot([], beans, NOW).openBeans).toBe(3);
  });

  it('ends the day at the next local midnight, also across a change of the clock', () => {
    // In zones with daylight saving time this day has 23 or 25 hours.
    const sunday = moment('2026-10-25 12:00', 'YYYY-MM-DD HH:mm').valueOf();

    const snapshot = buildWidgetSnapshot([], [], sunday);

    expect(snapshot.todayEndsAt).toBe(
      moment('2026-10-26', 'YYYY-MM-DD').unix(),
    );
    expect(snapshot.weekEndsAt).toBe(moment('2026-10-26', 'YYYY-MM-DD').unix());
  });

  it('reads 30,000 brews quickly', () => {
    const start = moment(NOW).subtract(3, 'years').unix();
    const brews = Array.from({ length: 30000 }, (_v, i) => ({
      config: { uuid: String(i), unix_timestamp: start + i * 3000 },
      bean: 'a',
    }));
    const beans = Array.from({ length: 2000 }, (_v, i) => ({
      finished: i % 2 === 0,
    }));

    const began = performance.now();
    const snapshot = buildWidgetSnapshot(brews, beans, NOW);
    const took = performance.now() - began;

    expect(snapshot.openBeans).toBe(1000);
    expect(took).toBeLessThan(100);
  });
});
