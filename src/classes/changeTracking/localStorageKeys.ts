/** Identity of this installation (device id). */
export const DEVICE_STORAGE_KEY = 'DEVICE';
/** Notes about entries deleted on this installation. */
export const DELETION_JOURNAL_STORAGE_KEY = 'DELETION_JOURNAL';
/** List of photo and graph files referenced by the stored entries. */
export const ATTACHMENT_MANIFEST_STORAGE_KEY = 'ATTACHMENT_MANIFEST';
/** Note about the last import on this installation (IRestoreNote). */
export const LAST_RESTORE_STORAGE_KEY = 'LAST_RESTORE';
/**
 * The entry that is being deleted together with the entries depending on
 * it, only stored while that runs (DeleteCommands).
 */
export const PENDING_DELETION_STORAGE_KEY = 'PENDING_DELETION';
/**
 * The data update that stayed open at the last starts in a row
 * (FailedDataUpdate), for the hint after the second one.
 */
export const FAILED_DATA_UPDATE_STORAGE_KEY = 'FAILED_DATA_UPDATE';

/**
 * Storage keys whose values belong to exactly this installation.
 *
 * They are never written into backup or export files, and importing a backup
 * never overwrites them, even if a file contains them. Writing them does not
 * trigger the automatic backups either, as those files would not contain them.
 * The import writes its own note under LAST_RESTORE_STORAGE_KEY and removes
 * the value under PENDING_DELETION_STORAGE_KEY.
 */
export const LOCAL_ONLY_STORAGE_KEYS: readonly string[] = [
  DEVICE_STORAGE_KEY,
  DELETION_JOURNAL_STORAGE_KEY,
  ATTACHMENT_MANIFEST_STORAGE_KEY,
  LAST_RESTORE_STORAGE_KEY,
  PENDING_DELETION_STORAGE_KEY,
  FAILED_DATA_UPDATE_STORAGE_KEY,
];

export function isLocalOnlyStorageKey(_key: string): boolean {
  return LOCAL_ONLY_STORAGE_KEYS.includes(_key);
}
