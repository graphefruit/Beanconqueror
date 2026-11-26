/**
 * What the VoiceOver Magic Tap does on a new brew: it starts the brew and
 * stops it again. A brew that already ran is reset without asking, so the
 * same gesture starts the next one.
 */
export type MagicTapAction = 'start' | 'resetAndStart' | 'stop';

export interface MagicTapTimer {
  readonly running: boolean;
  readonly seconds: number;
  readonly milliseconds: number;
  /** Values in the brew graph, see flowPoints. */
  readonly flowPoints: number;
}

export function magicTapAction(timer: MagicTapTimer): MagicTapAction {
  if (timer.running) {
    return 'stop';
  }
  return timer.seconds > 0 || timer.milliseconds > 0 || timer.flowPoints > 0
    ? 'resetAndStart'
    : 'start';
}

/** The brew time as the timer shows it, e.g. "0:42". */
export function spokenStopTime(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
