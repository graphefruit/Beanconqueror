/** A device whose first value the brew screen waits for after it connects. */
export type SilentDevice = 'scale' | 'pressure';

/** How long a connected device may stay silent before the brew screen says so. */
export const DEVICE_SILENCE_MS = 5000;

/** What decides the hint for a device that sent nothing since it connected. */
export interface DeviceSilenceState {
  device: SilentDevice;
  /** The scale sends its first weight only once the weight changes (Futula). */
  sendsOnlyOnChange: boolean;
  timerRunning: boolean;
}

/**
 * The hint for a device that is connected but sent no value within
 * DEVICE_SILENCE_MS, or null when none is due. A failed subscription still
 * reports the device as connected; turning the device off and on again makes
 * the app connect anew. A running brew is not interrupted.
 */
export function deviceSilenceHint(_state: DeviceSilenceState): string | null {
  if (_state.timerRunning) {
    return null;
  }
  if (_state.device === 'pressure') {
    return 'DEVICE_SILENCE_HINT.PRESSURE';
  }
  return _state.sendsOnlyOnChange
    ? 'DEVICE_SILENCE_HINT.SCALE_ON_CHANGE'
    : 'DEVICE_SILENCE_HINT.SCALE';
}
