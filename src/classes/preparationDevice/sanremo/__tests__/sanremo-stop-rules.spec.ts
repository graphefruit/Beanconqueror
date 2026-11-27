import { nextSanremoStopStep, SanremoStopWatch } from '../sanremo-stop-rules';

describe('nextSanremoStopStep', () => {
  const watch = (
    groupStatus: number,
    options: Partial<SanremoStopWatch> = {},
  ): SanremoStopWatch => ({
    groupStatus,
    sawEnd: false,
    resent: false,
    ...options,
  });

  it('waits until 3 s even when a fresh status shows the shot running', () => {
    expect(nextSanremoStopStep(watch(2), 600)).toBe('wait');
    expect(nextSanremoStopStep(watch(2, { statusAfterMs: 1500 }), 2999)).toBe(
      'wait',
    );
  });

  it('keeps watching a 0 for a restart before confirming', () => {
    expect(nextSanremoStopStep(watch(0, { sawEnd: true }), 900)).toBe('wait');
    expect(nextSanremoStopStep(watch(0, { sawEnd: true }), 1999)).toBe('wait');
  });

  for (const ended of [5, 6]) {
    it(`treats groupStatus ${ended} as an ended shot and never resends`, () => {
      expect(nextSanremoStopStep(watch(ended, { sawEnd: true }), 1999)).toBe(
        'wait',
      );
      expect(
        nextSanremoStopStep(watch(ended, { statusAfterMs: 1500 }), 3000),
      ).toBe('confirmed');
    });
  }

  it('confirms when the status is still 0 after 2 s', () => {
    expect(nextSanremoStopStep(watch(0, { sawEnd: true }), 2000)).toBe(
      'confirmed',
    );
    expect(
      nextSanremoStopStep(watch(0, { sawEnd: true, resent: true }), 2000),
    ).toBe('confirmed');
  });

  it('resends once when a status from 900 ms after the stop still runs at 3 s', () => {
    expect(nextSanremoStopStep(watch(2, { statusAfterMs: 900 }), 3000)).toBe(
      'resend',
    );
  });

  it('never resends without a status from 900 ms after the stop', () => {
    expect(nextSanremoStopStep(watch(2), 3000)).toBe('failed');
    expect(nextSanremoStopStep(watch(2, { statusAfterMs: 899 }), 5000)).toBe(
      'failed',
    );
  });

  it('resends at once on a restart after a 0', () => {
    expect(nextSanremoStopStep(watch(3, { sawEnd: true }), 1000)).toBe(
      'resend',
    );
  });

  it('gives up after the resend was ignored or the shot restarted again', () => {
    expect(
      nextSanremoStopStep(
        watch(2, { resent: true, statusAfterMs: 2000 }),
        3000,
      ),
    ).toBe('failed');
    expect(
      nextSanremoStopStep(watch(2, { sawEnd: true, resent: true }), 100),
    ).toBe('failed');
  });
});
