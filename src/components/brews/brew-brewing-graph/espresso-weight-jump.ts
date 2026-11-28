/**
 * A single reading far above the one before is a glitch of the scale (25.8 g,
 * then 259 g); a cup put on at once is none, its weight stays. The slowest
 * scales send three readings a second, so a jump held for three readings has
 * lasted about a second and is real.
 */
const READINGS_TO_CONFIRM_JUMP = 3;

/** A jump the graph does not record (yet). */
export interface PendingJump {
  readonly weight: number;
  readonly readings: number;
}

/**
 * Whether `weight`, rising more than `bound` above the recorded `lastWeight`,
 * is held back. Gives the jump that is held back, or `undefined` when
 * `weight` is to be recorded. Readings of one jump stay within `bound` of
 * each other.
 */
export function pendingEspressoJump(
  lastWeight: number,
  weight: number,
  bound: number,
  pending: PendingJump | undefined,
): PendingJump | undefined {
  if (weight <= lastWeight + bound) {
    return undefined;
  }
  const readings =
    pending !== undefined && Math.abs(weight - pending.weight) <= bound
      ? pending.readings + 1
      : 1;
  return readings >= READINGS_TO_CONFIRM_JUMP
    ? undefined
    : { weight, readings };
}
