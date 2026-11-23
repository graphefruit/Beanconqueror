import {
  pluginSpeechPitch,
  pluginSpeechRate,
  speaksScaleValues,
  speaksTimerOnly,
  speechLanguageTag,
  spokenWeight,
} from '../speech-options';

/** What WebKit asked AVSpeechUtterance for (default 0.5, fastest 1). */
function webKitIosRate(rate: number): number {
  const r = Math.min(10, Math.max(0.1, rate));
  return Math.min(1, r < 1 ? r * 0.5 : 0.5 + (r - 1) * 0.5);
}

/** What the plugin asks AVSpeechUtterance for (adjustRate in its iOS source). */
function pluginIosRate(rate: number): number {
  return Math.min(1, rate >= 1 ? 0.1 * rate + 0.4 : rate * 0.5);
}

describe('speech options', () => {
  it('lets iOS speak at the rate speech synthesis used before', () => {
    for (const rate of [0.1, 0.5, 0.9, 1, 1.3, 1.5, 2, 3.7, 10]) {
      expect(pluginIosRate(pluginSpeechRate(rate, true)))
        .withContext(`rate ${rate}`)
        .toBeCloseTo(webKitIosRate(rate), 5);
    }
  });

  it('passes the rate on as it is on Android', () => {
    expect(pluginSpeechRate(0.5, false)).toBe(0.5);
    expect(pluginSpeechRate(2.5, false)).toBe(2.5);
  });

  it('keeps the rate within the range of the settings', () => {
    expect(pluginSpeechRate(0, false)).toBe(0.1);
    expect(pluginSpeechRate(25, false)).toBe(10);
    expect(pluginSpeechRate(25, true)).toBe(6);
    expect(pluginSpeechRate(Number.NaN, true)).toBe(1);
    expect(pluginSpeechRate(undefined as unknown as number, false)).toBe(1);
  });

  it('keeps the pitch where both platforms follow it', () => {
    expect(pluginSpeechPitch(1.5)).toBe(1.5);
    expect(pluginSpeechPitch(0)).toBe(0.5);
    // The default of the settings is 3, which speech synthesis spoke as 2.
    expect(pluginSpeechPitch(3)).toBe(2);
    expect(pluginSpeechPitch(Number.NaN)).toBe(1);
  });

  it('turns the app language into a BCP 47 tag', () => {
    expect(speechLanguageTag('de')).toBe('de');
    expect(speechLanguageTag('zh_TW')).toBe('zh-TW');
    expect(speechLanguageTag('')).toBe('en');
    expect(speechLanguageTag(undefined)).toBe('en');
  });

  it('says either the values of the scale or only the time', () => {
    const cases = [
      { active: false, timerOnly: false, scale: false, timer: false },
      { active: false, timerOnly: true, scale: false, timer: false },
      { active: true, timerOnly: false, scale: true, timer: false },
      { active: true, timerOnly: true, scale: false, timer: true },
    ];
    for (const { active, timerOnly, scale, timer } of cases) {
      const settings = {
        text_to_speech_active: active,
        text_to_speech_timer_only: timerOnly,
      };
      expect(speaksScaleValues(settings))
        .withContext(`active ${active}, timer only ${timerOnly}`)
        .toBe(scale);
      expect(speaksTimerOnly(settings))
        .withContext(`active ${active}, timer only ${timerOnly}`)
        .toBe(timer);
    }
  });

  it('says one decimal for espresso unless whole grams are chosen', () => {
    expect(spokenWeight(18.26, true, false)).toBe('18.3');
    expect(spokenWeight(18.04, true, false)).toBe('18');
    expect(spokenWeight(18.26, true, true)).toBe('18');
    expect(spokenWeight(18.5, true, true)).toBe('19');
  });

  it('says whole grams for other brews', () => {
    expect(spokenWeight(251.6, false, false)).toBe('252');
    expect(spokenWeight(251.6, false, true)).toBe('252');
    expect(spokenWeight(-0.3, false, false)).toBe('0');
  });
});
