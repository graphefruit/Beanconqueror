/** Where the data of an import came from. */
export type RESTORE_SOURCE =
  /** A backup file chosen in the settings. */
  | 'import'
  /** The internal backup file, restored when the app starts. */
  | 'internal_backup';

/** Note about the last import that replaced the data of this installation. */
export interface IRestoreNote {
  /** Milliseconds since epoch when the import was stored, clock of this device. */
  last_restore_at: number;
  source: RESTORE_SOURCE;
  /** Number of entries the import stored in the change tracked collections. */
  record_count: number;
}
