import { inject, Injectable } from '@angular/core';

import { FileInfo } from '@capacitor/filesystem';

import { UILog } from '../uiLog';
import { PRE_IMPORT_BACKUP_FILES } from './pre-import-backup-files';

/** Folder in the app data directory with the backups written before an import. */
export const PRE_IMPORT_BACKUP_FOLDER = 'pre-import';

/** Number of backups kept, the newest one included. */
export const PRE_IMPORT_BACKUPS_KEPT = 3;

const FILE_NAME_PREFIX = 'Beanconqueror_pre_import_';

/** Ends the name of a backup of an unchanged import, see write(). */
const UNCHANGED_IMPORT_SUFFIX = '_imported';

/** Only files with exactly this name are backups of this service. */
const FILE_NAME_PATTERN =
  /^Beanconqueror_pre_import_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}(_imported)?\.zip$/;

/** Options of PreImportBackupService.write(). */
export interface PreImportBackupWriteOptions {
  /**
   * The data is what an import of a file chosen in the settings stored, and
   * nothing was changed since, so that file can be imported again.
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

/** Local time of `_date` as it is written into a file name. */
function fileTimestamp(_date: Date): string {
  const pad = (_value: number, _length = 2) =>
    String(_value).padStart(_length, '0');
  return (
    `${pad(_date.getFullYear(), 4)}-${pad(_date.getMonth() + 1)}-${pad(_date.getDate())}` +
    `_${pad(_date.getHours())}-${pad(_date.getMinutes())}-${pad(_date.getSeconds())}` +
    `-${pad(_date.getMilliseconds(), 3)}`
  );
}

function isBackupFile(_file: FileInfo): boolean {
  return FILE_NAME_PATTERN.test(_file.name);
}

function isUnchangedImport(_name: string): boolean {
  return _name.endsWith(`${UNCHANGED_IMPORT_SUFFIX}.zip`);
}

/** The names hold the time with fixed digits, so they sort by time. */
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
   */
  public async write(
    _zip: Blob,
    _options: PreImportBackupWriteOptions = {},
  ): Promise<string> {
    const suffix = _options.unchangedImport ? UNCHANGED_IMPORT_SUFFIX : '';
    const time = fileTimestamp(_options.now ?? new Date());
    const path = `${PRE_IMPORT_BACKUP_FOLDER}/${FILE_NAME_PREFIX}${time}${suffix}.zip`;
    await this.files.write(path, _zip);
    return path;
  }

  /**
   * Deletes older backups, so PRE_IMPORT_BACKUPS_KEPT are left: `_keep`, the
   * path write() resolved, the newest backup that is not of an unchanged
   * import, and the newest others. `_keep` always stays, also when a clock
   * set back gave it an older name. Other files are never touched. Never
   * rejects: the backups are only kept longer when deleting fails.
   *
   * After a few imports in a row, the newest backups only hold the data of
   * the files imported before, which can be imported again. The data from
   * before the first of them is kept: once that import is done, the
   * automatic backups are written with the imported data, so this backup is
   * the only copy of it.
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
    const ownData = isUnchangedImport(kept)
      ? others.find((_file) => !isUnchangedImport(_file.name))
      : undefined;
    const older = (
      ownData
        ? [ownData, ...others.filter((_file) => _file !== ownData)]
        : others
    ).slice(PRE_IMPORT_BACKUPS_KEPT - 1);
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
