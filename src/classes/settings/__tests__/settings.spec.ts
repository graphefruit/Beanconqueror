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
});
