import { nextSanremoStopStep, SanremoStopWatch } from '../sanremo-stop-rules';

describe('nextSanremoStopStep', () => {
  const watch = (
    groupStatus: number,
    options: Partial<SanremoStopWatch> = {},
  ): SanremoStopWatch => ({
    groupStatus,
    sawZero: false,
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
    expect(nextSanremoStopStep(watch(0, { sawZero: true }), 900)).toBe('wait');
    expect(nextSanremoStopStep(watch(0, { sawZero: true }), 1999)).toBe('wait');
  });

  it('confirms when the status is still 0 after 2 s', () => {
    expect(nextSanremoStopStep(watch(0, { sawZero: true }), 2000)).toBe(
      'confirmed',
    );
    expect(
      nextSanremoStopStep(watch(0, { sawZero: true, resent: true }), 2000),
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
    expect(nextSanremoStopStep(watch(3, { sawZero: true }), 1000)).toBe(
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
      nextSanremoStopStep(watch(2, { sawZero: true, resent: true }), 100),
    ).toBe('failed');
  });
});
