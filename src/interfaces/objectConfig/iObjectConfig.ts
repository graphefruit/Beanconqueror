/**
 * Created by lars on 10/18/2017.
 */
export interface IConfig {
  uuid: string;
  /**
   * Unix timestamp in seconds. Its meaning is unchanged by the change info
   * below; for brews it is the brew time the user can edit.
   */
  unix_timestamp: number;
  // Change info. All fields are optional: entries written before change
  // tracking started do not have them until they are filled in.
  /** Creation time in milliseconds; 0 = unknown. */
  created_at?: number;
  /**
   * Time of the last change in milliseconds by the device clock;
   * 0 = unknown or written before change tracking started.
   */
  updated_at?: number;
  /** Local revision counter of the entry; 0 = written before change tracking. */
  rev?: number;
  /** Device id of the installation that wrote the entry last; '' = unknown. */
  updated_by?: string;
}
