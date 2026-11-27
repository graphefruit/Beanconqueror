import {
  nextSanremoStopStep,
  noteSanremoStopStatus,
  SanremoStopWatch,
} from '../sanremo-stop-rules';

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

  it('resends at once when the running volume drops without a reported end', () => {
    const w = watch(1, { statusAfterMs: 300 });
    noteSanremoStopStatus(w, 1, 35.2);
    expect(nextSanremoStopStep(w, 300)).toBe('wait');
    w.statusAfterMs = 1500;
    noteSanremoStopStatus(w, 1, 0.5);
    expect(nextSanremoStopStep(w, 1500)).toBe('resend');
  });

  it('takes a volume drop before 900 ms for jitter, not a restart', () => {
    const w = watch(1, { statusAfterMs: 300 });
    noteSanremoStopStatus(w, 1, 36.2);
    w.statusAfterMs = 600;
    noteSanremoStopStatus(w, 1, 36.1);
    expect(nextSanremoStopStep(w, 600)).toBe('wait');
  });

  it('takes a cleared volume on the way to the end for no restart', () => {
    const w = watch(1, { statusAfterMs: 300 });
    noteSanremoStopStatus(w, 1, 36.2);
    w.statusAfterMs = 1000;
    noteSanremoStopStatus(w, 1, 0);
    expect(nextSanremoStopStep(w, 1000)).toBe('wait');
  });

  it('does not resend on a rising volume', () => {
    const w = watch(1);
    for (const vol of [35.2, 36.2, 37]) {
      noteSanremoStopStatus(w, 1, vol);
      expect(nextSanremoStopStep(w, 600)).toBe('wait');
    }
  });

  it('ignores the volume of an ended shot', () => {
    const w = watch(1);
    noteSanremoStopStatus(w, 1, 0.5);
    noteSanremoStopStatus(w, 0, 40);
    noteSanremoStopStatus(w, 1, 1);
    expect(w.maxRunningVol).toBe(1);
    expect(nextSanremoStopStep(w, 600)).toBe('wait');
  });

  it('ignores a status without a volume', () => {
    const w = watch(1);
    noteSanremoStopStatus(w, 1, 35.2);
    noteSanremoStopStatus(w, 1, NaN);
    expect(w.maxRunningVol).toBe(35.2);
    expect(nextSanremoStopStep(w, 600)).toBe('wait');
  });

  it('gives up when the volume drops again after the resend', () => {
    const w = watch(1, { resent: true, statusAfterMs: 1000 });
    noteSanremoStopStatus(w, 1, 20);
    noteSanremoStopStatus(w, 1, 0.5);
    expect(nextSanremoStopStep(w, 600)).toBe('failed');
  });
});
