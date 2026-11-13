import { EXPERIENCE_MODE_ENUM } from '../../enums/settings/experienceMode';

/**
 * Profile of the person using the app.
 *
 * It is part of the settings and therefore travels with backup and export
 * files to other devices. It must never hold credentials, access tokens or
 * other secrets; those belong to the list in settingsSecrets.ts.
 */
export interface IUserProfile {
  experience_mode: EXPERIENCE_MODE_ENUM;
  /** Empty string when not set. */
  nickname: string;
  /** Identifier (app version) of the last release notes shown; empty when none. */
  whats_new_seen: string;
  /**
   * True while the person still has to be told which experience mode the
   * app chose for them and that it can be changed. Set when the app picks
   * the advanced mode on its own (settings from before the profile existed,
   * a restored backup without a profile); cleared once the note was shown,
   * see UISettingsStorage.markModeHintShown().
   */
  mode_hint_pending: boolean;
}
