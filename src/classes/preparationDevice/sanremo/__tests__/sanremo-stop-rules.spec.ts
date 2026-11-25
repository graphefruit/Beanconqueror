import { nextSanremoStopStep } from '../sanremo-stop-rules';

describe('nextSanremoStopStep', () => {
  const watch = (groupStatus: number, sawZero = false, resent = false) => ({
    groupStatus,
    sawZero,
    resent,
  });

  it('waits while the old running status may still be reported', () => {
    expect(nextSanremoStopStep(watch(2), false)).toBe('wait');
  });

  it('waits for the deadline after a 0, a restart may still follow', () => {
    expect(nextSanremoStopStep(watch(0, true), false)).toBe('wait');
  });

  it('confirms when the status is 0 at the deadline', () => {
    expect(nextSanremoStopStep(watch(0, true), true)).toBe('confirmed');
    expect(nextSanremoStopStep(watch(0, true, true), true)).toBe('confirmed');
  });

  it('resends once when still running at the deadline', () => {
    expect(nextSanremoStopStep(watch(2), true)).toBe('resend');
  });

  it('resends at once on a restart after a 0', () => {
    expect(nextSanremoStopStep(watch(3, true), false)).toBe('resend');
  });

  it('gives up after the resend was ignored or the shot restarted again', () => {
    expect(nextSanremoStopStep(watch(2, false, true), true)).toBe('failed');
    expect(nextSanremoStopStep(watch(2, true, true), false)).toBe('failed');
  });
});
