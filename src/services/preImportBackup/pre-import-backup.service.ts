import { inject, Injectable } from '@angular/core';

import { FileInfo } from '@capacitor/filesystem';
import moment from 'moment';

import { UILog } from '../uiLog';
import { PRE_IMPORT_BACKUP_FILES } from './pre-import-backup-files';

/** Folder in the app data directory with the backups written before an import. */
export const PRE_IMPORT_BACKUP_FOLDER = 'pre-import';

/** Number of backups kept, the newest one included. */
export const PRE_IMPORT_BACKUPS_KEPT = 3;

const FILE_NAME_PREFIX = 'Beanconqueror_pre_import_';

/** Ends the name of a backup of an unchanged import, see write(). */
const UNCHANGED_IMPORT_SUFFIX = '_imported';

/**
 * Ends the name of a backup while it is written, see write(). A file with
 * that name is never taken for a backup.
 */
const UNFINISHED_SUFFIX = '.part';

/** Only files with exactly this name are backups of this service. */
const FILE_NAME_PATTERN =
  /^Beanconqueror_pre_import_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z(_imported)?\.zip$/;

/** Options of PreImportBackupService.write(). */
export interface PreImportBackupWriteOptions {
  /**
   * The data is what an import of a file chosen in the settings stored,
   * nothing was changed since, and that file can still be imported again
   * (canBeImportedAgain).
   */
  unchangedImport?: boolean;
  /** Time in the file name, now by default. */
  now?: Date;
}

/**
 * The current data could not be written into a backup file before an
 * import, so nothing was imported.
 */
export class PreImportBackupError extends Error {
  constructor(public readonly reason: unknown) {
    super('The current data could not be saved before the import');
    this.name = 'PreImportBackupError';
  }
}

/** Name of the internal backup and of every export. */
const BACKUP_FILE_NAME = 'Beanconqueror.zip';

const AUTOMATIC_BACKUP_FILE_PREFIX = 'Beanconqueror_automatic_export_';

/**
 * Days an automatic backup is kept after its day, see
 * UIFileHelper.deleteZIPBackupsOlderThanSevenDays().
 */
const AUTOMATIC_BACKUP_DAYS_KEPT = 7;

/**
 * Whether the backup file named `_fileName`, imported at `_importedAt`, is
 * at `_now` still there as it was imported, so it can be imported again
 * (times in milliseconds since epoch). Only then does the backup of the
 * data that import stored count as one of an unchanged import
 * (PreImportBackupWriteOptions.unchangedImport). Files the app replaces or
 * deletes itself do not count:
 * - Beanconqueror.zip is the name of the internal backup, which the
 *   automatic backups replace after every change and which the Files app
 *   shows on iOS, and of every export, which the next export replaces.
 * - The automatic backup of a day is replaced on that day, and deleted at
 *   start-up a week later.
 * - A backup of this service that data was brought back from: the rotation
 *   after the next import can delete it, and the backup written before
 *   that import is then the only copy of that data.
 * A name that is not known does not count either.
 */
export function canBeImportedAgain(
  _fileName: unknown,
  _importedAt: number,
  _now: number,
): boolean {
  if (
    typeof _fileName !== 'string' ||
    _fileName === '' ||
    _fileName === BACKUP_FILE_NAME ||
    _fileName.startsWith(FILE_NAME_PREFIX)
  ) {
    return false;
  }
  if (_fileName.startsWith(AUTOMATIC_BACKUP_FILE_PREFIX)) {
    const day = moment(
      _fileName.substring(AUTOMATIC_BACKUP_FILE_PREFIX.length),
      'DD_MM_YYYY[.zip]',
      true,
    );
    return (
      day.isValid() &&
      day.isBefore(moment(_importedAt), 'day') &&
      !day.isBefore(
        moment(_now).subtract(AUTOMATIC_BACKUP_DAYS_KEPT, 'days'),
        'day',
      )
    );
  }
  return true;
}

/**
 * Time of `_date` in UTC as it is written into a file name. Unlike the local
 * time, it does not go back when the time zone changes or daylight saving
 * time ends, so the names sort by the time the files were written.
 */
function fileTimestamp(_date: Date): string {
  const pad = (_value: number, _length = 2) =>
    String(_value).padStart(_length, '0');
  return (
    `${pad(_date.getUTCFullYear(), 4)}-${pad(_date.getUTCMonth() + 1)}-${pad(_date.getUTCDate())}` +
    `_${pad(_date.getUTCHours())}-${pad(_date.getUTCMinutes())}-${pad(_date.getUTCSeconds())}` +
    `-${pad(_date.getUTCMilliseconds(), 3)}Z`
  );
}

function isBackupFile(_file: FileInfo): boolean {
  return FILE_NAME_PATTERN.test(_file.name);
}

function isUnfinishedBackupFile(_file: FileInfo): boolean {
  return (
    _file.name.endsWith(UNFINISHED_SUFFIX) &&
    FILE_NAME_PATTERN.test(
      _file.name.substring(0, _file.name.length - UNFINISHED_SUFFIX.length),
    )
  );
}

function isUnchangedImport(_name: string): boolean {
  return _name.endsWith(`${UNCHANGED_IMPORT_SUFFIX}.zip`);
}

/** The names hold the time in UTC with fixed digits, so they sort by time. */
function newestFirst(_a: FileInfo, _b: FileInfo): number {
  if (_a.name === _b.name) {
    return 0;
  }
  return _a.name < _b.name ? 1 : -1;
}

/**
 * Backup files of the current data, written before an import replaces it
 * (see UIExportImportHelper.importBackup). They live in the app data
 * directory in the folder PRE_IMPORT_BACKUP_FOLDER, which the Files app
 * shows on iOS. The file picker of the import cannot open that directory on
 * Android, so they are also listed with the automatic backup files, from
 * where they can be imported again on both platforms.
 */
@Injectable({
  providedIn: 'root',
})
export class PreImportBackupService {
  private readonly files = inject(PRE_IMPORT_BACKUP_FILES);
  private readonly uiLog = inject(UILog);

  /** False in the browser, where no backup files can be written. */
  public isAvailable(): boolean {
    return this.files.isAvailable();
  }

  /**
   * Writes `_zip` as a new backup and resolves its path in the app data
   * directory. Rejects when the file could not be written. The name of a
   * backup of an unchanged import ends in `_imported`.
   *
   * The file is written under a name ending in `.part` and only gets its
   * name once it is complete: a write that fails, for example because the
   * storage is full, can leave an empty or cut off file behind, which must
   * never count as a backup. Such a file is removed, here and before the
   * next backup is written, in case the app was closed while writing.
   */
  public async write(
    _zip: Blob,
    _options: PreImportBackupWriteOptions = {},
  ): Promise<string> {
    const suffix = _options.unchangedImport ? UNCHANGED_IMPORT_SUFFIX : '';
    const time = fileTimestamp(_options.now ?? new Date());
    const path = `${PRE_IMPORT_BACKUP_FOLDER}/${FILE_NAME_PREFIX}${time}${suffix}.zip`;
    const unfinished = `${path}${UNFINISHED_SUFFIX}`;
    await this.removeUnfinishedBackups();
    try {
      await this.files.write(unfinished, _zip);
      await this.files.rename(unfinished, path);
    } catch (ex) {
      await this.removeUnfinishedBackups();
      throw ex;
    }
    return path;
  }

  /** Removes what a write that did not complete left behind. Never rejects. */
  private async removeUnfinishedBackups(): Promise<void> {
    try {
      const unfinished = (
        await this.files.list(PRE_IMPORT_BACKUP_FOLDER)
      ).filter(isUnfinishedBackupFile);
      for (const file of unfinished) {
        await this.files.remove(`${PRE_IMPORT_BACKUP_FOLDER}/${file.name}`);
        this.uiLog.log(
          `PreImportBackupService - removed unfinished ${file.name}`,
        );
      }
    } catch (ex) {
      this.uiLog.error(
        'PreImportBackupService - unfinished backups could not be removed',
        ex,
      );
    }
  }

  /**
   * Deletes older backups, so PRE_IMPORT_BACKUPS_KEPT are left: `_keep`, the
   * path write() resolved, and of the others first the newest ones that are
   * not backups of an unchanged import. Those only get a place that is left,
   * the newest ones first: their data can be imported again from the file it
   * came from. `_keep` always stays, also when a clock set back gave it an
   * older name. Other files are never touched. Never rejects: the backups
   * are only kept longer when deleting fails.
   *
   * After a few imports in a row, the newest backups only hold the data of
   * the files imported before. The data from before the first of them is
   * kept: once that import is done, the automatic backups are written with
   * the imported data, so this backup is the only copy of it.
   */
  public async removeOldBackups(_keep: string): Promise<void> {
    let backups: FileInfo[];
    try {
      backups = (await this.files.list(PRE_IMPORT_BACKUP_FOLDER)).filter(
        isBackupFile,
      );
    } catch (ex) {
      this.uiLog.error(
        'PreImportBackupService - backups could not be listed, none removed',
        ex,
      );
      return;
    }
    const kept = _keep.substring(_keep.lastIndexOf('/') + 1);
    const others = backups
      .filter((_file) => _file.name !== kept)
      .sort(newestFirst);
    const older = [
      ...others.filter((_file) => !isUnchangedImport(_file.name)),
      ...others.filter((_file) => isUnchangedImport(_file.name)),
    ].slice(PRE_IMPORT_BACKUPS_KEPT - 1);
    for (const file of older) {
      const path = `${PRE_IMPORT_BACKUP_FOLDER}/${file.name}`;
      try {
        await this.files.remove(path);
        this.uiLog.log(`PreImportBackupService - removed ${path}`);
      } catch (ex) {
        this.uiLog.error(
          `PreImportBackupService - ${path} could not be removed`,
          ex,
        );
      }
    }
  }

  /** The backups, newest first. None when they cannot be listed; never rejects. */
  public async list(): Promise<FileInfo[]> {
    if (!this.files.isAvailable()) {
      return [];
    }
    try {
      return (await this.files.list(PRE_IMPORT_BACKUP_FOLDER))
        .filter(isBackupFile)
        .sort(newestFirst);
    } catch (ex) {
      this.uiLog.error(
        'PreImportBackupService - backups could not be listed',
        ex,
      );
      return [];
    }
  }
}
