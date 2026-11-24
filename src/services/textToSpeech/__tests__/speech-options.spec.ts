import {
  brewTimeToSay,
  migrateSpeechSettings,
  pluginSpeechPitch,
  pluginSpeechRate,
  speechLanguageTag,
  spokenBrewValues,
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

  it('says each brew value whose switch is on, and nothing when speech is off', () => {
    const switches = {
      text_to_speech_weight: true,
      text_to_speech_brew_time: false,
      text_to_speech_brew_start_end: true,
    };

    expect(
      spokenBrewValues({ text_to_speech_active: true, ...switches }),
    ).toEqual({ weight: true, time: false, startAndEnd: true });
    expect(
      spokenBrewValues({ text_to_speech_active: false, ...switches }),
    ).toEqual({ weight: false, time: false, startAndEnd: false });
  });

  describe('settings saved before each brew value had a switch', () => {
    it('turns off the weight of "brew time only" and drops the old switch', () => {
      expect(
        migrateSpeechSettings({
          text_to_speech_active: true,
          text_to_speech_timer_only: true,
          text_to_speech_whole_grams: true,
          text_to_speech_interval_rate: 750,
        }),
      ).toEqual({
        text_to_speech_active: true,
        text_to_speech_weight: false,
        text_to_speech_whole_grams: true,
        text_to_speech_interval_rate: 750,
      });
    });

    it('leaves the weight to its default without "brew time only"', () => {
      expect(
        migrateSpeechSettings({
          text_to_speech_active: true,
          text_to_speech_timer_only: false,
        }),
      ).toEqual({ text_to_speech_active: true });
      expect(migrateSpeechSettings({ text_to_speech_active: true })).toEqual({
        text_to_speech_active: true,
      });
    });

    it('keeps a weight switch saved already', () => {
      expect(
        migrateSpeechSettings({
          text_to_speech_timer_only: true,
          text_to_speech_weight: true,
        }),
      ).toEqual({ text_to_speech_weight: true });
    });
  });

  describe('brew time to say', () => {
    /** Feeds the timer's ticks in and returns what is said. */
    function said(
      ticksMs: number[],
      intervalSeconds: number,
      showsMilliseconds = false,
    ): string[] {
      const spoken: string[] = [];
      let last: number | undefined;
      for (const elapsed of ticksMs) {
        const { step, say } = brewTimeToSay(
          last,
          elapsed,
          intervalSeconds,
          showsMilliseconds,
        );
        last = step;
        if (say !== undefined) {
          spoken.push(say);
        }
      }
      return spoken;
    }

    it('says the time the timer shows at every multiple of the interval', () => {
      const seconds = Array.from({ length: 11 }, (_, i) => i * 1000);

      expect(said(seconds, 5)).toEqual(['5', '10']);
      expect(said(seconds.slice(0, 4), 0.25)).toEqual(['1', '2', '3']);
      expect(said(seconds.slice(0, 4), 0.75)).toEqual(['1', '2', '3']);
    });

    it('says the multiple of the interval when the timer shows milliseconds', () => {
      const ticks = Array.from({ length: 80 }, (_, i) => i * 10 + 4);

      expect(said(ticks, 0.25, true)).toEqual(['0.25', '0.5', '0.75']);
      expect(said([4990, 5003, 5250], 5, true)).toEqual(['5']);
    });

    it('starts counting where a resumed timer stands', () => {
      expect(said([7000, 8000, 9000, 10_000], 5)).toEqual(['10']);
    });
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
