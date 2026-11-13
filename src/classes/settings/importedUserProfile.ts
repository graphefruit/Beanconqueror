import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';
import { Settings } from './settings';

/**
 * Returns the settings object of a backup as it is to be imported, as far as
 * the user profile is concerned.
 *
 * A backup holds data of someone who already used the app, so after the
 * import the advanced mode is used, also on an installation that started
 * with the beginner mode. Backups made before the profile existed (and
 * backups with a broken one) therefore get the advanced mode, and the note
 * that tells about the mode is still to be shown. A backup that brings its
 * own experience mode keeps it together with the rest of its profile: that
 * mode was chosen for this data before, a beginner stays a beginner.
 *
 * Other values of a broken profile that can still be used are kept. The
 * given object is left untouched; a value that is not a settings object is
 * returned as it is.
 */
export function withImportedUserProfile<T>(_settings: T): T {
  if (
    typeof _settings !== 'object' ||
    _settings === null ||
    Array.isArray(_settings)
  ) {
    return _settings;
  }
  const user: unknown = (_settings as { user?: unknown }).user;
  if (Settings.hasExperienceMode(user)) {
    return _settings;
  }
  const keptUser =
    typeof user === 'object' && user !== null && !Array.isArray(user)
      ? user
      : {};
  return {
    ..._settings,
    user: {
      ...keptUser,
      experience_mode: EXPERIENCE_MODE_ENUM.ADVANCED,
      mode_hint_pending: true,
    },
  };
}
