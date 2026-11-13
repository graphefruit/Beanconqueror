import { EXPERIENCE_MODE_ENUM } from '../../../enums/settings/experienceMode';
import { withImportedUserProfile } from '../importedUserProfile';

describe('withImportedUserProfile', () => {
  it('gives settings without a profile the advanced mode with the note pending', () => {
    // Arrange
    const settings = { language: 'de' };

    // Act
    const result = withImportedUserProfile(settings);

    // Assert
    expect(result).toEqual({
      language: 'de',
      user: {
        experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
        mode_hint_pending: true,
      },
    } as any);
    expect(settings).toEqual({ language: 'de' });
  });

  it('keeps usable values of a profile with an unknown mode', () => {
    // Arrange
    const user = { experience_mode: 'expert', nickname: 'Kim' };
    const settings = { user };

    // Act
    const result = withImportedUserProfile(settings) as any;

    // Assert
    expect(result.user).toEqual({
      experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
      nickname: 'Kim',
      mode_hint_pending: true,
    });
    expect(user).toEqual({ experience_mode: 'expert', nickname: 'Kim' });
  });

  for (const mode of Object.values(EXPERIENCE_MODE_ENUM)) {
    it(`returns settings whose profile has the ${mode} mode unchanged`, () => {
      // Arrange
      const settings = {
        user: { experience_mode: mode, mode_hint_pending: false },
      };

      // Act
      const result = withImportedUserProfile(settings);

      // Assert
      expect(result).toBe(settings);
    });
  }

  for (const [label, value] of [
    ['null', null],
    ['an array', []],
    ['a string', 'settings'],
  ] as [string, unknown][]) {
    it(`returns ${label} as it is`, () => {
      expect(withImportedUserProfile(value)).toBe(value);
    });
  }
});
