import {
  nextSanremoStopStep,
  sanremoStopDeadlineMs,
} from '../sanremo-stop-rules';

describe('nextSanremoStopStep', () => {
  const watch = (
    groupStatus: number,
    { sawZero = false, resent = false, acked = false } = {},
  ) => ({ groupStatus, sawZero, resent, acked });

  it('waits while the old running status may still be reported', () => {
    expect(nextSanremoStopStep(watch(2), 600)).toBe('wait');
    expect(nextSanremoStopStep(watch(2), 1199)).toBe('wait');
  });

  it('does not resend an acknowledged stop before 3 s', () => {
    expect(nextSanremoStopStep(watch(1, { acked: true }), 600)).toBe('wait');
    expect(nextSanremoStopStep(watch(1, { acked: true }), 2999)).toBe('wait');
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

  it('resends once when still running at the deadline', () => {
    expect(nextSanremoStopStep(watch(2), 1200)).toBe('resend');
    expect(nextSanremoStopStep(watch(2, { acked: true }), 3000)).toBe('resend');
  });

  it('resends at once on a restart after a 0', () => {
    expect(nextSanremoStopStep(watch(3, { sawZero: true }), 1000)).toBe(
      'resend',
    );
  });

  it('gives up after the resend was ignored or the shot restarted again', () => {
    expect(nextSanremoStopStep(watch(2, { resent: true }), 1200)).toBe(
      'failed',
    );
    expect(
      nextSanremoStopStep(watch(2, { sawZero: true, resent: true }), 100),
    ).toBe('failed');
  });

  it('gives the machine longer once it acknowledged the stop', () => {
    expect(sanremoStopDeadlineMs(false)).toBe(1200);
    expect(sanremoStopDeadlineMs(true)).toBe(3000);
  });
});
