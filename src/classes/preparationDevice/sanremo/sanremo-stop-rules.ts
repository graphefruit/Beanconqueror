/**
 * The stop command (key 220) toggles the shot like the YOU button: sent to a
 * machine that has already stopped, it starts a new shot. Values change only
 * every ~300 ms, and a log showed the stop ~900 ms after an acknowledged
 * command, so a blind resend at 600 ms restarted the shot. We resend only
 * when the machine has clearly not stopped.
 */

/** Without an acknowledgement: ~900 ms until the stop shows, plus one 300 ms tick. */
export const SANREMO_UNACKED_DEADLINE_MS = 1200;
/** The machine took the command; only a firmware that ignores it still runs by now. */
export const SANREMO_ACKED_DEADLINE_MS = 3000;
/**
 * A restart (e.g. the machine stopped itself at its volume limit and our stop
 * toggled it on again) shows ~900 ms after the command, so a 0 is only final
 * after this time.
 */
export const SANREMO_CONFIRM_AFTER_MS = 2000;
/** How long a stop requested during a reconnect waits for the connection. */
export const SANREMO_PENDING_STOP_MS = 5000;

export type SanremoStopStep = 'wait' | 'confirmed' | 'resend' | 'failed';

export interface SanremoStopWatch {
  /** The single allowed second stop has been sent. */
  resent: boolean;
  /** A 0 was reported since the last stop. */
  sawZero: boolean;
  /** The machine answered the last stop with success. */
  acked: boolean;
  groupStatus: number;
}

export function sanremoStopDeadlineMs(acked: boolean): number {
  return acked ? SANREMO_ACKED_DEADLINE_MS : SANREMO_UNACKED_DEADLINE_MS;
}

/** elapsedMs counts from the last stop sent. */
export function nextSanremoStopStep(
  watch: SanremoStopWatch,
  elapsedMs: number,
): SanremoStopStep {
  if (watch.groupStatus === 0) {
    return elapsedMs >= SANREMO_CONFIRM_AFTER_MS ? 'confirmed' : 'wait';
  }
  // A 0 is always a fresh value, so running after it is a real restart.
  if (!watch.sawZero && elapsedMs < sanremoStopDeadlineMs(watch.acked)) {
    return 'wait';
  }
  return watch.resent ? 'failed' : 'resend';
}
