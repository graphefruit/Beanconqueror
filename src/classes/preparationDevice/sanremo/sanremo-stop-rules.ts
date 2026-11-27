/**
 * The stop command (key 220) toggles the shot like the YOU button: sent to a
 * machine that has already stopped, it starts a new shot. Values change only
 * every ~300 ms, and a log showed the stop ~900 ms after the command, so a
 * blind resend at 600 ms restarted the shot. We resend only when a status sent
 * after the stop could have taken effect still shows the shot running; without
 * such a status we rather report a failed stop than risk a new shot.
 */

/** By now a machine that took the stop shows it; only a firmware that ignores it still runs. */
export const SANREMO_STOP_DEADLINE_MS = 3000;
/** A status received earlier than this after the stop may still show the old running shot. */
export const SANREMO_FRESH_STATUS_MS = 900;
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
  groupStatus: number;
  /** When the latest status arrived, in ms after the last stop; undefined before the first one. */
  statusAfterMs?: number;
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
  if (!watch.sawZero) {
    if (elapsedMs < SANREMO_STOP_DEADLINE_MS) {
      return 'wait';
    }
    if (!isFreshSanremoStatus(watch)) {
      return 'failed';
    }
  }
  return watch.resent ? 'failed' : 'resend';
}

export function isFreshSanremoStatus(watch: SanremoStopWatch): boolean {
  return (watch.statusAfterMs ?? -1) >= SANREMO_FRESH_STATUS_MS;
}
