import { EXPERIENCE_MODE_ENUM } from '../../../enums/settings/experienceMode';
import { Settings } from '../settings';

describe('Settings', () => {
  it('defaults the cloud AI prompt appendix to an empty string', () => {
    // Arrange

    // Act
    const settings = new Settings();

    // Assert
    expect(settings.cloud_ai_prompt_appendix).toBe('');
  });

  it('defaults the cloud AI prompt appendix when hydrating legacy settings', () => {
    // Arrange
    const legacySettings = new Settings();
    Reflect.deleteProperty(legacySettings, 'cloud_ai_prompt_appendix');
    const hydratedSettings = new Settings();
    hydratedSettings.cloud_ai_prompt_appendix = 'stale appendix';

    // Act
    hydratedSettings.initializeByObject(legacySettings);

    // Assert
    expect(hydratedSettings.cloud_ai_prompt_appendix).toBe('');
  });

  it('loads stored settings that still hold the removed safety question switch', () => {
    const stored = {
      ...JSON.parse(JSON.stringify(new Settings())),
      security_check_when_going_back: true,
    } as Settings;
    const settings = new Settings();

    expect(() => settings.initializeByObject(stored)).not.toThrow();
    expect(settings.wake_lock).toBeFalse();
  });

  for (const url of ['', undefined]) {
    it(`gives settings with the Visualizer address ${JSON.stringify(url)} the default server`, () => {
      const stored = JSON.parse(JSON.stringify(new Settings())) as Settings;
      stored.visualizer_url = url;
      const settings = new Settings();

      settings.initializeByObject(stored);

      expect(settings.visualizer_url).toBe('https://visualizer.coffee/');
    });
  }

  it('keeps an own Visualizer address', () => {
    const stored = JSON.parse(JSON.stringify(new Settings())) as Settings;
    stored.visualizer_url = 'https://visualizer.example.com/';
    const settings = new Settings();

    settings.initializeByObject(stored);

    expect(settings.visualizer_url).toBe('https://visualizer.example.com/');
  });

  describe('spoken brew values of settings saved before their switches', () => {
    /** Settings as an older version saved them, with the given speech fields. */
    function saved(speech: object): Settings {
      const old = JSON.parse(JSON.stringify(new Settings()));
      for (const field of [
        'text_to_speech_weight',
        'text_to_speech_whole_grams',
        'text_to_speech_brew_time',
        'text_to_speech_brew_time_interval',
        'text_to_speech_brew_start_end',
      ]) {
        delete old[field];
      }
      const settings = new Settings();
      settings.initializeByObject({ ...old, ...speech });
      return settings;
    }

    const switches = (settings: Settings) => ({
      weight: settings.text_to_speech_weight,
      wholeGrams: settings.text_to_speech_whole_grams,
      time: settings.text_to_speech_brew_time,
      every: settings.text_to_speech_brew_time_interval,
      startAndEnd: settings.text_to_speech_brew_start_end,
      weightEveryMs: settings.text_to_speech_interval_rate,
    });

    it('say the weight, the time every 5 s, start and end as before', () => {
      const settings = saved({
        text_to_speech_active: true,
        text_to_speech_interval_rate: 400,
      });

      expect(settings.text_to_speech_active).toBeTrue();
      expect(switches(settings)).toEqual({
        weight: true,
        wholeGrams: false,
        time: true,
        every: 5,
        startAndEnd: true,
        weightEveryMs: 400,
      });
    });
  });

  describe('user profile', () => {
    function storedSettingsWithUser(_user: unknown): Settings {
      const stored = JSON.parse(JSON.stringify(new Settings())) as Settings;
      if (_user === undefined) {
        Reflect.deleteProperty(stored, 'user');
      } else {
        (stored as any).user = _user;
      }
      return stored;
    }

    it('defaults new installations to the beginner mode', () => {
      // Act
      const settings = new Settings();

      // Assert
      expect(settings.user).toEqual({
        experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
        nickname: '',
        whats_new_seen: '',
        mode_hint_pending: false,
      });
    });

    it('keeps the beginner mode when a new installation stores its first settings', () => {
      // Arrange
      const firstStored = JSON.parse(JSON.stringify(new Settings()));
      const hydrated = new Settings();

      // Act
      hydrated.initializeByObject(firstStored);

      // Assert
      expect(hydrated.user.experience_mode).toBe(EXPERIENCE_MODE_ENUM.BEGINNER);
      expect(hydrated.user.mode_hint_pending).toBeFalse();
    });

    for (const [label, value] of [
      ['missing', undefined],
      ['null', null],
      ['an array', []],
      ['a string', 'beginner'],
    ] as [string, unknown][]) {
      it(`treats stored settings with a ${label} profile as an existing installation`, () => {
        // Arrange
        const stored = storedSettingsWithUser(value);
        const hydrated = new Settings();

        // Act
        hydrated.initializeByObject(stored);

        // Assert
        expect(hydrated.user).toEqual({
          experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
          nickname: '',
          whats_new_seen: '',
          mode_hint_pending: true,
        });
      });
    }

    it('falls back to the advanced mode for an unknown experience mode', () => {
      // Arrange
      const stored = storedSettingsWithUser({
        experience_mode: 'expert',
        nickname: 'Kim',
        whats_new_seen: 42,
        mode_hint_pending: false,
      });
      const hydrated = new Settings();

      // Act
      hydrated.initializeByObject(stored);

      // Assert
      expect(hydrated.user).toEqual({
        experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
        nickname: 'Kim',
        whats_new_seen: '',
        // The app chose the mode, so the note about it is still to be shown.
        mode_hint_pending: true,
      });
    });

    it('takes over a valid stored profile as a new object', () => {
      // Arrange
      const storedUser = {
        experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
        nickname: 'Kim',
        whats_new_seen: '9.0.0',
        mode_hint_pending: true,
      };
      const stored = storedSettingsWithUser(storedUser);
      const hydrated = new Settings();

      // Act
      hydrated.initializeByObject(stored);

      // Assert
      expect(hydrated.user).toEqual(storedUser);
      expect(hydrated.user).not.toBe(storedUser);
    });

    for (const [label, value] of [
      ['missing', undefined],
      ['not a boolean', 'yes'],
    ] as [string, unknown][]) {
      it(`does not show the note for a chosen mode when the flag is ${label}`, () => {
        // Arrange
        const stored = storedSettingsWithUser({
          experience_mode: EXPERIENCE_MODE_ENUM.BEGINNER,
          nickname: '',
          whats_new_seen: '',
          mode_hint_pending: value,
        });
        const hydrated = new Settings();

        // Act
        hydrated.initializeByObject(stored);

        // Assert
        expect(hydrated.user.mode_hint_pending).toBeFalse();
      });
    }
  });

  it('moves stored graph colours at a former default, keeps chosen ones', () => {
    const stored = JSON.parse(JSON.stringify(new Settings())) as Settings;
    stored.graph_colors.weight.active.light = '#cdc2ac';
    stored.graph_colors.pressure.active.light = '#ff00ff';
    const settings = new Settings();

    settings.initializeByObject(stored);

    expect(settings.graph_colors.weight.active.light).toBe(
      new Settings().graph_colors.weight.active.light,
    );
    expect(settings.graph_colors.pressure.active.light).toBe('#ff00ff');
  });
});
