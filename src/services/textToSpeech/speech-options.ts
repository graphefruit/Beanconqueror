import type { Settings } from '../../classes/settings/settings';

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

type BrewSpeechSettings = Pick<
  Settings,
  | 'text_to_speech_active'
  | 'text_to_speech_weight'
  | 'text_to_speech_brew_time'
  | 'text_to_speech_brew_start_end'
>;

/** Which brew values are said: each has its own switch under the main one. */
export function spokenBrewValues(settings: BrewSpeechSettings) {
  const on = settings.text_to_speech_active === true;
  return {
    weight: on && settings.text_to_speech_weight,
    time: on && settings.text_to_speech_brew_time,
    startAndEnd: on && settings.text_to_speech_brew_start_end,
  };
}

/**
 * The brew time to say once the timer has run `elapsedMs`: at every multiple
 * of the interval, as the timer shows it. A timer without milliseconds shows
 * whole seconds only, so there the time is said at the first second that
 * reaches the interval since the last one said: 0.25 s says every second,
 * 1.5 s every 2 s. `lastStep` is the multiple reached last, undefined while
 * the timer stands; the result carries the one to pass next.
 */
export function brewTimeToSay(
  lastStep: number | undefined,
  elapsedMs: number,
  intervalSeconds: number,
  showsMilliseconds: boolean,
): { step: number; say?: string } {
  const intervalMs = Math.round(
    (showsMilliseconds
      ? intervalSeconds
      : Math.max(1, Math.ceil(intervalSeconds))) * 1000,
  );
  const step = Math.floor(elapsedMs / intervalMs);
  if (lastStep === undefined || step <= lastStep) {
    return { step };
  }
  const say = showsMilliseconds
    ? +((step * intervalMs) / 1000).toFixed(3)
    : Math.floor(elapsedMs / 1000);
  return { step, say: String(say) };
}

/**
 * The decimals of every scale weight that is said, for all preparation
 * methods: tenths, or whole grams when chosen, as a decimal takes the Android
 * voice noticeably longer to say.
 */
export function spokenWeightDecimals(wholeGrams: boolean): number {
  return wholeGrams ? 0 : 1;
}

/**
 * The weight as it is said, with the decimal separator of the app language,
 * so a German voice says "18,3" as a decimal and not as a date or ordinal.
 */
export function spokenWeight(
  grams: number,
  decimals: number,
  appLanguage: string | undefined,
): string {
  // `|| 0` says a weight rounded to -0 as 0.
  const rounded = +grams.toFixed(decimals) || 0;
  return new Intl.NumberFormat(speechLanguageTag(appLanguage), {
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(rounded);
}
