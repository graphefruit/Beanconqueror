/**
 * The Sanremo YOU firmware may ignore a stop or restart the shot right after
 * it (volume limit close to the stop point). Its values change only every
 * ~300 ms, so a running status shortly after the stop may still be the old
 * value; at the deadline the current status is known for sure. A reported 0
 * is always fresh, so a running status after a 0 is a restart.
 */
export const SANREMO_STOP_DEADLINE_MS = 600;

export type SanremoStopStep = 'wait' | 'confirmed' | 'resend' | 'failed';

export interface SanremoStopWatch {
  /** The single allowed second stop has been sent. */
  resent: boolean;
  /** A 0 was reported since the last stop. */
  sawZero: boolean;
  groupStatus: number;
}

export function nextSanremoStopStep(
  watch: SanremoStopWatch,
  deadlineReached: boolean,
): SanremoStopStep {
  const running = watch.groupStatus !== 0;
  if (!deadlineReached && !(running && watch.sawZero)) {
    return 'wait';
  }
  if (!running) {
    return 'confirmed';
  }
  return watch.resent ? 'failed' : 'resend';
}
