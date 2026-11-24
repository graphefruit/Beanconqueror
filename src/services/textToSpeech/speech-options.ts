/**
 * The rate and pitch in the settings use the scale of the Web Speech API that
 * spoke them before the native plugin: rate 0.1–10 and pitch 0–2, 1 is normal.
 */
export const SPEECH_RATE_MIN = 0.1;
export const SPEECH_RATE_MAX = 10;
/** Below 0.5 iOS speaks at 0.5 anyway, and Android ignores a pitch of 0. */
export const SPEECH_PITCH_MIN = 0.5;
export const SPEECH_PITCH_MAX = 2;

/**
 * Above this rate WebKit already asked iOS for its fastest speech, so the
 * plugin is never asked for more.
 */
const IOS_FASTEST_SETTING = 2;

function clamp(value: number, min: number, max: number, fallback: number) {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/**
 * The rate to pass to the plugin for the rate in the settings. Android takes
 * it as it is. On iOS, WebKit turned a rate r ≥ 1 into 0.5 + (r − 1) · 0.5 of
 * AVSpeechUtterance (default 0.5, fastest 1), the plugin turns p ≥ 1 into
 * 0.1 · p + 0.4; p = 5r − 4 sounds as before. Below 1 both use r · 0.5.
 */
export function pluginSpeechRate(rate: number, ios: boolean): number {
  const setting = clamp(rate, SPEECH_RATE_MIN, SPEECH_RATE_MAX, 1);
  if (!ios || setting < 1) {
    return setting;
  }
  return 5 * Math.min(setting, IOS_FASTEST_SETTING) - 4;
}

/** The pitch to pass to the plugin; it is the same scale on both platforms. */
export function pluginSpeechPitch(pitch: number): number {
  return clamp(pitch, SPEECH_PITCH_MIN, SPEECH_PITCH_MAX, 1);
}

/** The app language ('zh_TW', 'de') as a BCP 47 tag ('zh-TW', 'de'). */
export function speechLanguageTag(appLanguage: string | undefined): string {
  return appLanguage ? appLanguage.replace('_', '-') : 'en';
}
