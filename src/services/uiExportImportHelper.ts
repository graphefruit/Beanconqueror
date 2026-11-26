import { inject, Service } from '@angular/core';

import { ModalController, Platform } from '@ionic/angular';

import { Directory, FileInfo } from '@capacitor/filesystem';
/**
 * Handles every helping functionalities
 */

import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import * as zip from '@zip.js/zip.js';
import moment from 'moment';

import { CHANGE_TRACKED_COLLECTIONS } from '../classes/changeTracking/changeTracking';
import {
  DELETION_JOURNAL_STORAGE_KEY,
  LAST_RESTORE_STORAGE_KEY,
  LOCAL_ONLY_STORAGE_KEYS,
} from '../classes/changeTracking/localStorageKeys';
import { withoutSettingsSecrets } from '../classes/settings/settingsSecrets';
import {
  IRestoreNote,
  RESTORE_SOURCE,
} from '../interfaces/changeTracking/iRestoreNote';
import { DataCorruptionFoundComponent } from '../popover/data-corruption-found/data-corruption-found.component';
import { SettingsChooseAutomaticBackupToImportComponent } from '../popover/settings-choose-automatic-backup-to-import/settings-choose-automatic-backup-to-import.component';
import {
  canBeImportedAgain,
  PreImportBackupError,
  PreImportBackupService,
} from './preImportBackup/pre-import-backup.service';
import { UIAlert } from './uiAlert';
import { UIBrewStorage } from './uiBrewStorage';
import { UIFileHelper } from './uiFileHelper';
import { UILog } from './uiLog';
import { UISettingsStorage } from './uiSettingsStorage';
import { StoredValues, UIStorage } from './uiStorage';

const EXPORT_MAIN_FILE_NAME = 'Beanconqueror.json';
const INTERNAL_BACKUP_ZIP = 'Beanconqueror.zip';
const INTERNAL_BACKUP_PART = 'Beanconqueror.zip.part';
/** Written beside Beanconqueror.zip, so the start need not read that file. */
const INTERNAL_BACKUP_SUMMARY = 'Beanconqueror.zip.meta.json';
const INTERNAL_BACKUP_SUMMARY_PART = 'Beanconqueror.zip.meta.json.part';
const INTERNAL_BACKUP_SUMMARY_VERSION = 1;
/** The collections the check at start-up compares with the database. */
const BACKUP_COUNTED = ['BEANS', 'BREWS', 'PREPARATION', 'MILL'] as const;
type BackupCounts = Record<(typeof BACKUP_COUNTED)[number], number>;

/**
 * What is stored beside Beanconqueror.zip. `size` and `mtime` are those of
 * the file it was written for: a backup of the same size can follow without
 * a new summary, when the app is ended before the summary is written.
 */
interface InternalBackupSummary {
  version: number;
  size: number;
  mtime: number;
  counts: BackupCounts;
}

const EXPORT_CHUNKING_CONFIG = [
  {
    propertyName: 'BREWS',
    fileName: 'Brews',
    chunkSize: 500,
  },
  {
    propertyName: 'BEANS',
    fileName: 'Beans',
    chunkSize: 500,
  },
  {
    propertyName: 'BARISTAMODE_BREWS',
    fileName: 'Baristamode',
    chunkSize: 250,
  },
];

function chunkFileName(fileName: string, index: number): string {
  return `Beanconqueror_${fileName}_${index}.json`;
}

/**
 * Whether the internal backup holds more beans, brews, preparations or
 * grinders than the device, whose counts are those of
 * UIStorage.hasCorruptedData(); always when they are not known.
 */
function holdsMoreThanDevice(
  _backup: Partial<BackupCounts>,
  _device: BackupCounts | undefined,
): boolean {
  return (
    !_device || BACKUP_COUNTED.some((_key) => _backup[_key] > _device[_key])
  );
}

/**
 * The entries of each counted collection in stored values (UIStorage.export())
 * as the backup file of them holds them, none when one is no list. Copies of
 * an entry count as well: the check at start-up removes identical copies
 * from the file before it counts, so the file never holds more than this,
 * and holding no more than the device means the same for the file.
 */
function backupCountsOf(
  _stored: Record<string, unknown>,
): BackupCounts | undefined {
  const counts: Partial<BackupCounts> = {};
  for (const key of BACKUP_COUNTED) {
    const entries: unknown = _stored?.[key];
    if (entries !== undefined && !Array.isArray(entries)) {
      return undefined;
    }
    counts[key] = Array.isArray(entries) ? entries.length : 0;
  }
  return counts as BackupCounts;
}

/** Whether stored values (UIStorage.export()) hold settings or entries. */
function holdsDataToSave(_stored: any): boolean {
  return ['SETTINGS', ...CHANGE_TRACKED_COLLECTIONS].some(
    (_key) => Array.isArray(_stored?.[_key]) && _stored[_key].length > 0,
  );
}

/**
 * Whether stored values (UIStorage.export()) are what the last import of a
 * file chosen in the settings stored, while that file can still be imported
 * again at `_now` (canBeImportedAgain): no entry was added, changed or
 * deleted since, as their change info and the deletion journal tell.
 * Settings carry no change info and do not count. An entry the app adds
 * itself counts as well, like the standard mill for imported brews without
 * one. Data restored from the internal backup never counts as unchanged, as
 * the automatic backups replace that file.
 *
 * The times compared come from the clock of the device, so a change made
 * after the clock was set back can look older than the import. Two checks
 * that do not depend on the times of the entries are made first, and in
 * doubt the data counts as changed: the import must not lie in the future,
 * and the number of entries must still be the one the import stored.
 */
function holdsUnchangedImport(_stored: any, _now: number): boolean {
  const note: Partial<IRestoreNote> | undefined =
    _stored?.[LAST_RESTORE_STORAGE_KEY];
  const restoredAt = note?.last_restore_at;
  if (
    note?.source !== 'import' ||
    typeof restoredAt !== 'number' ||
    !Number.isFinite(restoredAt) ||
    restoredAt > _now ||
    !canBeImportedAgain(note.file_name, restoredAt, _now)
  ) {
    return false;
  }
  let recordCount = 0;
  for (const collection of CHANGE_TRACKED_COLLECTIONS) {
    if (Array.isArray(_stored[collection])) {
      recordCount += _stored[collection].length;
    }
  }
  if (recordCount !== note.record_count) {
    return false;
  }
  const isLater = (_time: unknown) =>
    typeof _time === 'number' && _time > restoredAt;
  const changed = CHANGE_TRACKED_COLLECTIONS.some(
    (_collection) =>
      Array.isArray(_stored[_collection]) &&
      _stored[_collection].some((_entry: any) =>
        isLater(_entry?.config?.updated_at),
      ),
  );
  const journal = _stored[DELETION_JOURNAL_STORAGE_KEY];
  const deleted =
    Array.isArray(journal) &&
    journal.some((_note: any) => isLater(_note?.deleted_at));
  return !changed && !deleted;
}

/**
 * How an import ended (UIStorage.import()): `BACKUP` is true when it failed
 * and was rolled back, `cause` is then the error of the import.
 */
export interface ImportResult {
  BACKUP: boolean;
  cause?: unknown;
}

/**
 * An import failed and the values from before could not be written back
 * completely, so the stored data can be a mix of old and imported values.
 * `messageKey` is the text to show: it only names the backup written before
 * the import when there is one. `cause` is the error of the import.
 */
export class ImportNotRolledBackError extends Error {
  public readonly messageKey: string;

  constructor(_backupWritten: boolean, _cause?: unknown) {
    super('The import failed and could not be rolled back', {
      cause: _cause,
    });
    this.name = 'ImportNotRolledBackError';
    this.messageKey = _backupWritten
      ? 'IMPORT_NOT_ROLLED_BACK'
      : 'IMPORT_NOT_ROLLED_BACK_NO_BACKUP';
  }
}

/**
 * The error that made an import fail, for the technical details of the
 * message: the one inside when only its consequence was wrapped around it.
 */
export function importFailureCause(_error: unknown): unknown {
  if (_error instanceof PreImportBackupError) {
    return _error.reason;
  }
  if (_error instanceof ImportNotRolledBackError) {
    return _error.cause;
  }
  return _error;
}

@Service()
export class UIExportImportHelper {
  private readonly uiSettings = inject(UISettingsStorage);
  uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly modalController = inject(ModalController);
  private readonly preImportBackup = inject(PreImportBackupService);

  /**
   *
   */
  private isAppReady: number = -1;

  /**
   * Set when the internal backup was to be restored at start-up, but was
   * not: the current data could not be saved first, or the import failed.
   * Beanconqueror.zip still holds the data to restore, so the automatic
   * backups leave it alone for the rest of this session, and the next start
   * can offer the restore again.
   */
  private internalBackupNotRestored = false;

  /**
   * Set when the database could not be read at start-up. Beanconqueror.zip
   * is then the only copy known to be readable, so the automatic backups
   * leave it alone until every collection was read (allCollectionsRead).
   */
  private databaseNotRead = false;

  /**
   * Whether restoring the internal backup was started at this start-up but
   * not completed. Only reads the flag.
   */
  public restoreAtStartFailed(): boolean {
    return this.internalBackupNotRestored;
  }

  /** Called once every collection was read, at start-up or after an import. */
  public allCollectionsRead(): void {
    this.databaseNotRead = false;
  }

  /** Whether importBackup() writes the current data into a file first. */
  public savesBackupBeforeImport(): boolean {
    return this.preImportBackup.isAvailable();
  }

  /**
   * Replaces the stored data with a parsed backup (UIStorage.import()).
   *
   * First the current data is written into a backup file in the app data
   * directory (PreImportBackupService). It is the same ZIP an export writes,
   * so it holds no credentials (they stay on the device anyway) and no values
   * of this installation. Only then is anything replaced. If the current
   * data cannot be read or the file cannot be written, nothing is imported
   * and this rejects with PreImportBackupError. Unlike the copy the import
   * rolls back to, the file is not lost when the app is closed during the
   * import.
   *
   * No file is written:
   * - in the browser: the app has no file system there (UIFileHelper only
   *   works on iOS and Android), and no import could open such a file again.
   *   The browser build is used for development, so the import is not
   *   stopped there; it still rolls back from its copy in memory when it
   *   fails.
   * - when the device stores neither settings nor entries, as after a loss
   *   of all data: there is nothing to save, and an empty file would push a
   *   real backup out of the ones kept.
   *
   * After a completed import, older backups are removed, those of data
   * that had not just been imported from a file last
   * (PreImportBackupService.removeOldBackups). A failed import removes
   * none: the file it was started from can be one of them, and after a
   * restore of the internal backup that could not be rolled back the first
   * backup written is the only one of the data from before; those of the
   * next starts, which offer the restore again, hold the mix that was left
   * and would push it out. When that restore was rolled back, the backup
   * just written is removed again: the stored data is the same as before,
   * and one would be added at every such start. It stays when the database
   * cannot be read afterwards.
   *
   * Rejects with ImportNotRolledBackError when the import failed and could
   * not be rolled back; the backup written before is never removed then.
   *
   * `_fileName` is the name of the backup file chosen in the settings, when
   * it is known. Only while that file can still be imported again does the
   * backup before the next import count as one of an unchanged import
   * (holdsUnchangedImport).
   *
   * `_currentDataUnreadable` is only set for a backup chosen at start-up
   * because the database still could not be read right before: the current
   * data is then not saved first, instead of stopping the import.
   */
  public async importBackup(
    _data: unknown,
    _source: RESTORE_SOURCE,
    _fileName?: string,
    _currentDataUnreadable = false,
  ): Promise<ImportResult> {
    const { written, current } = await this.__writeBackupBeforeImport(
      _currentDataUnreadable,
    );
    let completed = false;
    let rolledBack = false;
    try {
      // The values the file was written from are the copy to roll back to.
      const result: ImportResult = await this.uiStorage.import(
        _data,
        _source,
        _fileName,
        _currentDataUnreadable,
        current,
      );
      completed = result?.BACKUP === false;
      rolledBack = result?.BACKUP === true;
      return result;
    } catch (ex) {
      throw (ex as ImportResult)?.BACKUP === true
        ? new ImportNotRolledBackError(
            written !== undefined,
            (ex as ImportResult).cause,
          )
        : ex;
    } finally {
      // Neither rejects, so a failed import keeps its own error.
      if (
        written !== undefined &&
        _source === 'internal_backup' &&
        rolledBack &&
        // The file is only a second copy while the data can be read.
        (await this.uiStorage.getDataState()) !== 'unknown'
      ) {
        await this.preImportBackup.remove(written);
      } else if (written !== undefined && completed) {
        await this.preImportBackup.removeOldBackups(written);
      }
    }
  }

  /**
   * Resolves the path of the written file, none when none is needed, and
   * the values read for it. Whether there is data to save is decided on the
   * values the file is written from, so data that cannot be read stops the
   * import instead of being taken for none.
   */
  private async __writeBackupBeforeImport(
    _currentDataUnreadable: boolean,
  ): Promise<{ written?: string; current?: StoredValues }> {
    if (!this.preImportBackup.isAvailable()) {
      this.uiLog.info(
        'Backup before import - skipped, there is no file system in the browser',
      );
      return {};
    }
    if (_currentDataUnreadable) {
      this.uiLog.error(
        'Backup before import - skipped, the current data could not be read at start-up',
      );
      return {};
    }
    try {
      const current = await this.uiStorage.readValues();
      const stored = current.values;
      if (!holdsDataToSave(stored)) {
        this.uiLog.info('Backup before import - skipped, no data stored');
        return { current };
      }
      const written = await this.preImportBackup.write(
        await this.buildExportZIP(stored),
        { unchangedImport: holdsUnchangedImport(stored, Date.now()) },
      );
      this.uiLog.log(`Backup before import - written to ${written}`);
      return { written, current };
    } catch (ex) {
      this.uiLog.error(
        'Backup before import - could not be written, nothing is imported',
        ex,
      );
      throw new PreImportBackupError(ex);
    }
  }

  /**
   * Writes the current data into a backup file before the data updates at
   * a start change entries, of which `_update` is the first one still open:
   * the same content as before an import, in a file of its own that is
   * listed with the backups to import and never deleted by the app
   * (PreImportBackupService.writeBeforeMigration). When an earlier start
   * wrote one for the same `_update` and its updates did not finish, that
   * one is kept and no other is written. Resolves false when the data could
   * not be read or the file not written, after telling the user; the caller
   * then changes nothing. True in the browser, where no file can be written
   * (see importBackup()).
   */
  public async writeBackupBeforeMigration(_update: string): Promise<boolean> {
    if (!this.preImportBackup.isAvailable()) {
      this.uiLog.info(
        'Backup before migration - skipped, there is no file system in the browser',
      );
      return true;
    }
    if (await this.preImportBackup.hasMigrationBackup(_update)) {
      this.uiLog.info(
        `Backup before migration - kept the one written before ${_update} at an earlier start`,
      );
      return true;
    }
    try {
      const written = await this.preImportBackup.writeBeforeMigration(
        await this.buildExportZIP((await this.uiStorage.readValues()).values),
        _update,
      );
      this.uiLog.log(`Backup before migration - written to ${written}`);
      return true;
    } catch (ex) {
      this.uiLog.error(
        'Backup before migration - could not be written, nothing is changed',
        ex,
      );
      await this.__sayBackupNotRestored('MIGRATION_BACKUP_FAILED');
      return false;
    }
  }

  /**
   * `_stored` are the values of UIStorage.export() when the caller already
   * read them; otherwise they are read here.
   */
  public async buildExportZIP(_stored?: any): Promise<Blob> {
    const _data = _stored ?? (await this.uiStorage.export());

    // A shallow copy is enough: keys are only removed from it and values
    // only replaced, so the values read are never changed.
    const mainJsonData = { ..._data };
    // Values that belong to this installation never leave it.
    for (const key of LOCAL_ONLY_STORAGE_KEYS) {
      delete mainJsonData?.[key];
    }
    if (Array.isArray(mainJsonData?.SETTINGS)) {
      // Backup files leave the device, so credentials are never written into them.
      mainJsonData.SETTINGS = mainJsonData.SETTINGS.map((_settings: unknown) =>
        withoutSettingsSecrets(_settings),
      );
    }

    const chunkedData: { fileName: string; content: unknown }[] = [];
    for (const c of EXPORT_CHUNKING_CONFIG) {
      const entry = _data?.[c.propertyName];
      if (entry?.length > 0) {
        let chunkIndex = 0;
        for (let i = 0; i < entry.length; i += c.chunkSize) {
          const chunk = entry.slice(i, i + c.chunkSize);
          if (chunkIndex == 0) {
            // store the first chunk in the main file
            mainJsonData[c.propertyName] = chunk;
          } else {
            chunkedData.push({
              fileName: chunkFileName(c.fileName, chunkIndex),
              content: chunk,
            });
          }
          chunkIndex++;
        }
      }
    }

    if (this.platform.is('ios')) {
      // iOS got corrupt zip file, when compression is used, removing this, results into a bigger zip file, but leads into a working zip file again.
      zip.configure({ useCompressionStream: false });
    }
    const zipWriter = new ZipWriter(new BlobWriter());

    await zipWriter.add(
      EXPORT_MAIN_FILE_NAME,
      new TextReader(JSON.stringify(mainJsonData)),
    );

    for (const chunk of chunkedData) {
      await zipWriter.add(
        chunk.fileName,
        new TextReader(JSON.stringify(chunk.content)),
      );
    }

    const zipFileBlob = await zipWriter.close();
    return zipFileBlob;
  }

  public async getJSONFromZIPArrayBufferContent(
    _arrayBuffer: Uint8Array<ArrayBuffer> | ArrayBuffer,
  ): Promise<any> {
    const readBlob = new Blob([_arrayBuffer], {
      type: 'application/zip',
    });
    const zipFileReader = new BlobReader(readBlob);
    const zipReader = new ZipReader(zipFileReader);

    const entries = await zipReader.getEntries();
    if (entries.length == 0) {
      throw new Error('Attempted to import empty zip file');
    }
    const foundGeneralEntry = entries.find(
      (e) => e.filename === EXPORT_MAIN_FILE_NAME,
    );
    if (
      foundGeneralEntry === undefined ||
      !this.isFileEntry(foundGeneralEntry)
    ) {
      await zipReader.close();
      throw new Error(
        `ZIP file does not contain a ${EXPORT_MAIN_FILE_NAME} file`,
      );
    }

    const generalWriter = new TextWriter();
    const generalImportText = await foundGeneralEntry.getData(generalWriter);
    let importJSONData = JSON.parse(generalImportText);

    // handle chunked import data
    for (const c of EXPORT_CHUNKING_CONFIG) {
      // start at index 1 because chunk 0 is always in the main file
      let i = 1;
      let entry: zip.Entry;
      while (
        (entry = entries.find(
          (e) => e.filename === chunkFileName(c.fileName, i),
        )) !== undefined &&
        this.isFileEntry(entry)
      ) {
        this.uiLog.log(`Found ${entry.filename} - Import`);
        const textWriter = new TextWriter();
        const chunkJSON = await entry.getData(textWriter);
        const chunk = JSON.parse(chunkJSON);
        importJSONData[c.propertyName].push(...chunk);
        i++;
      }
    }

    await zipReader.close();
    return importJSONData;
  }

  private isFileEntry(entry: zip.Entry): entry is zip.FileEntry {
    return !entry.directory;
  }

  private async __getBiggerFileBackupOrAutomatic(): Promise<{
    fileData: any;
    isAutomaticBackup: boolean;
  }> {
    const parsedJSON: any = await this.readBackupZIPFile();

    //const biggestAutomaticBackupFileContent = await this.__getBiggestAutomaticBackupFileContent();
    let isAutomaticBackup: boolean = false;
    let fileData: any;
    this.uiLog.log(
      '__getBiggerFileBackupOrAutomatic - Get backup and automatic backup and check besides',
    );
    /** If an app is completely new, there is no BREWS entry, because we just start with settings and version **/
    if (parsedJSON && 'BREWS' in parsedJSON) {
      fileData = parsedJSON;
      return { fileData, isAutomaticBackup };
    }
  }
  private async checkBackupAndSeeIfDataAreCorrupted() {
    try {
      this.uiLog.log(
        'checkBackupAndSeeIfDataAreCorrupted - Check if we got a corruption',
      );
      if (this.databaseNotRead) {
        // A backup was chosen in its place (checkDatabaseReadable).
        return;
      }
      const dataState = await this.uiStorage.getDataState();
      if (dataState === 'unknown') {
        await this.__importChosenBackupOfUnreadableDatabase();
        return;
      }
      const hasData = dataState === 'data';

      const summary = await this.__readInternalBackupSummary();
      // Read while the database is counted, neither changes anything.
      const backup = summary
        ? undefined
        : this.__getBiggerFileBackupOrAutomatic();
      let actualUIStorageDataObj;
      if (hasData) {
        actualUIStorageDataObj = await this.uiStorage.hasCorruptedData(
          undefined,
          true,
        );
      }
      if (
        hasData &&
        summary &&
        !holdsMoreThanDevice(summary.counts, actualUIStorageDataObj?.DATA)
      ) {
        this.uiLog.log(
          'checkBackupAndSeeIfDataAreCorrupted - Check over - the summary of the internal backup holds no more data, the file is not read',
        );
        return;
      }

      // Otherwise the file decides, as it is the one restored.
      const { fileData, isAutomaticBackup }: any = await (backup ??
        this.__getBiggerFileBackupOrAutomatic());

      if (fileData) {
        // Counted as an import would store it: after the copies of entries
        // sharing a uuid were cleaned up, a backup written before has more
        // entries than the device, although nothing was lost. The device is
        // counted the same way (UIStorage.hasCorruptedData), so copies it
        // still stores before the cleanup do not hide a lost entry either.
        await this.uiStorage.removeDuplicateEntries(fileData);
        let importBackup: boolean = false;
        if (!hasData && isAutomaticBackup === false) {
          /**We don't have any data, so we import the latest file data
           * But we just import the latest backup file data, and not the latest automatic backup, because we sort by biggest size.
           */
          this.uiLog.log(
            "checkBackupAndSeeIfDataAreCorrupted - We didn't find any data, so import the backup file directly.",
          );
          importBackup = true;
        } else {
          const dataObj = actualUIStorageDataObj?.DATA;
          // Without counts of the database, the data counts as corrupted.
          const somethingCorrupted = holdsMoreThanDevice(
            {
              BEANS: fileData.BEANS?.length,
              BREWS: fileData.BREWS?.length,
              PREPARATION: fileData.PREPARATION?.length,
              MILL: fileData.MILL?.length,
            },
            dataObj,
          );

          this.uiLog.log(
            'checkBackupAndSeeIfDataAreCorrupted- Check over - if we got a deep corruption - Result: ' +
              somethingCorrupted,
          );
          if (somethingCorrupted) {
            importBackup = await this.showDataCorruptionPopover(
              dataObj,
              fileData,
              isAutomaticBackup,
            );
          } else {
            this.uiLog.log(
              "checkBackupAndSeeIfDataAreCorrupted - Check over - we didn't find any corrupted data, don't import",
            );
          }
        }
        if (importBackup) {
          await this.importBackupJSON(fileData);
        }
      } else {
        this.uiLog.log(
          "checkBackupAndSeeIfDataAreCorrupted - We didn't find any json backup data so we can't do any checks",
        );
      }
    } catch (ex) {
      this.uiLog.log(
        'Check over - if we got a deep corruption - Result exception: ',
        ex,
      );
    }
  }

  private async __getBiggestAutomaticBackupFileContent() {
    try {
      let files = await this.uiFileHelper.listAutomaticBackupFiles();
      if (files.length > 0) {
        files = files.sort((a: FileInfo, b: FileInfo) => {
          return b.size - a.size;
        });
        const biggestFile = files[0];

        const zipContent = await this.uiFileHelper.readFileAsUint8Array(
          biggestFile.uri,
        );
        const parsedJSON =
          await this.getJSONFromZIPArrayBufferContent(zipContent);
        return parsedJSON;
      }
    } catch (ex) {}
    return null;
  }

  public async showDataCorruptionPopover(
    _actualUIStorageDataObj: any,
    _backupDataObj: any,
    _isAutomaticBackup: boolean = false,
  ) {
    const modal = await this.modalController.create({
      component: DataCorruptionFoundComponent,
      id: DataCorruptionFoundComponent.POPOVER_ID,
      componentProps: {
        actualUIStorageDataObj: _actualUIStorageDataObj,
        backupDataObj: _backupDataObj,
        isAutomaticBackup: _isAutomaticBackup,
      },
    });
    await modal.present();
    const returnData = await modal.onWillDismiss();
    this.uiLog.log(
      'Data corruption, choose to import: ' + returnData?.data?.import,
    );
    if (returnData?.data?.import) {
      //User choose to import backup, go
      return true;
    }
    return false;
  }

  public async checkBackup(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      return;
    }

    try {
      this.uiLog.log('Check Backup');

      await this.checkBackupAndSeeIfDataAreCorrupted();
    } catch (error) {
      this.uiLog.error('Error while checking for backup data:', error);
    }
  }

  /**
   * Called right after UIStorage.init() in the app. A database that cannot
   * be read is not taken for an empty one (see
   * __importChosenBackupOfUnreadableDatabase).
   *
   * Before that, and so before anything reads the internal backup or a
   * change can start an automatic backup, a complete internal backup that
   * did not get its name is given it.
   */
  public async checkDatabaseReadable(): Promise<void> {
    await this.__nameCompleteUnfinishedInternalBackup();
    if ((await this.uiStorage.getDataState()) === 'unknown') {
      await this.__importChosenBackupOfUnreadableDatabase();
    }
  }

  /**
   * The start does not go on with a database that could not be read. The
   * entries can still be stored and be newer than the internal backup, so
   * nothing is imported by itself and the internal backup is kept. The
   * database dialog asks to close the app and start it again, which mostly
   * helps, or to choose a backup from the list of the settings, the
   * internal backup first. Resolves once the chosen backup was imported;
   * asks again otherwise.
   */
  private async __importChosenBackupOfUnreadableDatabase(): Promise<void> {
    this.databaseNotRead = true;
    this.uiLog.error(
      'The database could not be read, the internal backup is not imported by itself and kept as it is',
    );
    while (true) {
      await this.uiAlert.showIOSIndexedDBIssues(
        'DATABASE_NOT_READ_DESCRIPTION',
        'IOS_DATABASE_ISSUE_TITLE',
        true,
        'CHOOSE_BACKUP',
      );
      const modal = await this.modalController.create({
        component: SettingsChooseAutomaticBackupToImportComponent,
        id: SettingsChooseAutomaticBackupToImportComponent.POPOVER_ID,
      });
      await modal.present();
      const uri: string = (await modal.onWillDismiss())?.data?.choosenURI;
      if (!uri) {
        continue;
      }
      try {
        await this.uiAlert.showLoadingSpinner();
        const parsedJSON = await this.getJSONFromZIPArrayBufferContent(
          await this.uiFileHelper.readFileAsUint8Array(uri),
        );
        // Read again with all attempts: only data that still cannot be
        // read is imported over without a backup of it.
        const result = await this.importBackup(
          parsedJSON,
          'import',
          uri.substring(uri.lastIndexOf('/') + 1),
          (await this.uiStorage.getDataState()) === 'unknown',
        );
        if (result?.BACKUP === false) {
          this.uiLog.log('Imported the backup chosen at start-up');
          await this.uiAlert.hideLoadingSpinner();
          return;
        }
        await this.__sayBackupNotRestored(
          'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
          result?.cause,
        );
      } catch (ex) {
        this.uiLog.error('Could not import the backup chosen at start-up', ex);
        await this.__sayBackupNotRestored(
          ex instanceof ImportNotRolledBackError
            ? ex.messageKey
            : 'IMPORT_UNSUCCESSFULLY',
          importFailureCause(ex),
        );
      }
    }
  }

  /**
   * An automatic backup renames its complete file to Beanconqueror.zip, for
   * which the plugin deletes the file of that name first. When the app was
   * ended in between, the complete file still has its unfinished name and
   * no internal backup is left, so it gets the name here. Only when there is
   * no Beanconqueror.zip: beside it the unfinished file is an older write or
   * one that was cut off. A file that cannot be read as a backup is left for
   * the next automatic backup to delete. Never rejects.
   *
   * A renaming that failed leaves the same behind while the app goes on, so
   * every automatic backup does this before it writes: its write deletes the
   * unfinished file first and would leave no backup at all if it then fails.
   */
  private async __nameCompleteUnfinishedInternalBackup(): Promise<void> {
    try {
      if (
        (await this.uiFileHelper.statInternalFile(INTERNAL_BACKUP_ZIP)) !==
          undefined ||
        (await this.uiFileHelper.statInternalFile(INTERNAL_BACKUP_PART)) ===
          undefined
      ) {
        return;
      }
      await this.getJSONFromZIPArrayBufferContent(
        await this.uiFileHelper.readInternalFileAsUint8Array(
          INTERNAL_BACKUP_PART,
        ),
      );
      await this.uiFileHelper.renameInternalFile(
        INTERNAL_BACKUP_PART,
        INTERNAL_BACKUP_ZIP,
      );
      this.uiLog.info(
        'Internal backup - was complete but not renamed, renamed it now',
      );
    } catch (ex) {
      this.uiLog.error(
        'Internal backup - the unfinished file is no complete backup or could not be renamed, left as it is',
        ex,
      );
    }
  }

  /**
   * The summary written with Beanconqueror.zip (__saveInternalBackupSummary),
   * only while that file still has the size and time of change it was
   * written for. Nothing otherwise, and the file is read. Never rejects.
   */
  private async __readInternalBackupSummary(): Promise<
    InternalBackupSummary | undefined
  > {
    try {
      const summary: Partial<InternalBackupSummary> = JSON.parse(
        await this.uiFileHelper.readInternalFileAsText(INTERNAL_BACKUP_SUMMARY),
      );
      const file =
        await this.uiFileHelper.statInternalFile(INTERNAL_BACKUP_ZIP);
      if (
        summary?.version === INTERNAL_BACKUP_SUMMARY_VERSION &&
        Number.isFinite(file?.mtime) &&
        summary.mtime === file.mtime &&
        summary.size === file.size &&
        BACKUP_COUNTED.every(
          (_key) =>
            Number.isSafeInteger(summary.counts?.[_key]) &&
            summary.counts[_key] >= 0,
        )
      ) {
        return summary as InternalBackupSummary;
      }
      this.uiLog.log(
        'Internal backup - the summary does not belong to the file, the file is read',
      );
    } catch (ex) {
      this.uiLog.log('Internal backup - no summary read, the file is read', ex);
    }
    return undefined;
  }

  private importBackupJSON(_parsedJSON: unknown) {
    const promise = new Promise(async (resolve, reject) => {
      await this.uiAlert.showLoadingSpinner();

      this.importBackup(_parsedJSON, 'internal_backup').then(
        async (_result) => {
          if (_result?.BACKUP === false) {
            this.uiLog.log('Sucessfully imported  Backup');
            setTimeout(() => {
              this.uiAlert.hideLoadingSpinner();
            }, 150);
            resolve(null);
            return;
          }
          // Rolled back, the app starts with the stored data.
          this.internalBackupNotRestored = true;
          this.uiLog.error('Could not import  Backup, it was rolled back');
          await this.__sayBackupNotRestored(
            'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
            _result?.cause,
          );
          resolve(null);
        },
        async (_error: unknown) => {
          this.internalBackupNotRestored = true;
          this.uiLog.error('Could not import  Backup');
          let message = 'IMPORT_UNSUCCESSFULLY';
          if (_error instanceof PreImportBackupError) {
            // Nothing was imported, the app starts with the stored data.
            message = 'PRE_IMPORT_BACKUP_FAILED';
          } else if (_error instanceof ImportNotRolledBackError) {
            message = _error.messageKey;
          }
          await this.__sayBackupNotRestored(
            message,
            importFailureCause(_error),
          );
          resolve(null);
        },
      );
    });
    return promise;
  }

  /**
   * Says that restoring a backup or a data update at start-up did not
   * happen. Otherwise the user would only see it tried again at the next
   * start. Never rejects.
   */
  private async __sayBackupNotRestored(
    _message: string,
    _details?: unknown,
  ): Promise<void> {
    try {
      await this.uiAlert.hideLoadingSpinner();
      await this.uiAlert.showMessageWithDetails(_message, _details);
    } catch (ex) {
      this.uiLog.error('Could not import  Backup - message not shown', ex);
    }
  }

  private readBackupZIPFile() {
    // If we don't got any data, we check now if there is a Beanconqueror.zip saved.
    const promise = new Promise(async (resolve, reject) => {
      this.uiFileHelper.readInternalFileAsUint8Array(INTERNAL_BACKUP_ZIP).then(
        async (_arrayBuffer) => {
          try {
            this.uiLog.log('Read ZIP-File, we found an zip-file');
            const parsedJSON =
              await this.getJSONFromZIPArrayBufferContent(_arrayBuffer);
            resolve(parsedJSON);
          } catch (ex) {
            resolve(null);
          }
        },
        () => {
          this.uiLog.log(
            `Read ZIP-FILE failed, try to read an old ${EXPORT_MAIN_FILE_NAME}`,
          );
          this.uiFileHelper.readInternalJSONFile(EXPORT_MAIN_FILE_NAME).then(
            async (_json) => {
              this.uiLog.log('Read ZIP-File, we found an json-file');
              resolve(_json);
            },
            () => {
              this.uiLog.log(
                'Check Backup - We couldnt retrieve any JSON file',
              );
              resolve(null);
            },
          );
        },
      );
    });
    return promise;
  }

  private getAutomatedBackupFilename(): string {
    return moment().format('DD_MM_YYYY').toString();
  }

  /** Resolves once both files are written or writing them failed. */
  public async saveAutomaticBackups() {
    await this.uiStorage
      .export()
      .then(async (_stored) => ({
        stored: _stored,
        blob: await this.buildExportZIP(_stored),
      }))
      .then(
        async ({ stored, blob: _blob }) => {
          try {
            // Also false for a database that cannot be read: nothing is written.
            const hasData = (await this.uiStorage.getDataState()) === 'data';

            let actualUIStorageDataObj;
            if (hasData) {
              // Counted on the values written into the files.
              actualUIStorageDataObj =
                await this.uiStorage.hasCorruptedData(stored);
            }
            if (hasData && !actualUIStorageDataObj.CORRUPTED) {
              this.uiLog.debug('Start writing automatic backups');
              const writes: Promise<void>[] = [];
              if (this.internalBackupNotRestored || this.databaseNotRead) {
                this.uiLog.info(
                  'Internal backup kept, it was not restored at start-up or not everything was read',
                );
              } else {
                writes.push(
                  this.__saveInternalBeanconquerorDump(_blob, stored),
                );
              }
              writes.push(this.__saveAutomaticBeanconquerorDump(_blob));
              await Promise.allSettled(writes);
            } else if (hasData && actualUIStorageDataObj.CORRUPTED) {
              this.uiLog.error(
                'Data inside the database seems like corrupted / no data',
              );
              const settings = this.uiSettingsStorage.getSettings();
              if (settings.show_backup_issues) {
                this.uiAlert.showMessage(
                  'ZIP_BACKUP_FILE_COULD_NOT_BE_BUILD',
                  'CARE',
                  'OK',
                  true,
                );
              }
            }
          } catch (ex) {
            this.uiLog.error('ZIP file could not be saved');
            const settings = this.uiSettingsStorage.getSettings();
            if (settings.show_backup_issues) {
              this.uiAlert.showMessage(
                'ZIP_BACKUP_FILE_COULD_NOT_BE_BUILD',
                'CARE',
                'OK',
                true,
              );
            }
          }
        },
        () => {
          this.uiLog.error('ZIP file could not be saved');
          const settings = this.uiSettingsStorage.getSettings();
          if (settings.show_backup_issues) {
            this.uiAlert.showMessage(
              'ZIP_BACKUP_FILE_COULD_NOT_BE_BUILD',
              'CARE',
              'OK',
              true,
            );
          }
        },
      );
  }
  /** `_stored` are the values `_blob` was built from. */
  private async __saveInternalBeanconquerorDump(
    _blob: Blob,
    _stored: Record<string, unknown>,
  ) {
    await this.__nameCompleteUnfinishedInternalBackup();
    try {
      await this.uiFileHelper.replaceInternalFileFromBlob(
        _blob,
        INTERNAL_BACKUP_ZIP,
        INTERNAL_BACKUP_PART,
      );
      await this.__saveInternalBackupSummary(_blob.size, _stored);
    } catch (ex) {
      // The summary still belongs to the file from before, when it is left.
      this.uiLog.error('Could not to export normal ZIP file');
      const settings = this.uiSettingsStorage.getSettings();
      if (settings.show_backup_issues) {
        this.uiAlert.showMessage(
          'INTERNAL_BACKUP_DID_FAIL',
          'CARE',
          'OK',
          true,
        );
      }
    }
  }

  /**
   * Writes what the check at start-up counts in Beanconqueror.zip beside it,
   * once that file got its name, so the start need not read it. Like the
   * file, it is written under another name first. When it cannot be written,
   * the summary from before no longer belongs to the file and is deleted.
   * Never rejects; the next start then reads the file.
   */
  private async __saveInternalBackupSummary(
    _size: number,
    _stored: Record<string, unknown>,
  ): Promise<void> {
    try {
      const counts = backupCountsOf(_stored);
      const file =
        await this.uiFileHelper.statInternalFile(INTERNAL_BACKUP_ZIP);
      // Another size: the file is not the one just written.
      if (!counts || file?.size !== _size) {
        throw new Error('Nothing to summarize for the file written');
      }
      const summary: InternalBackupSummary = {
        version: INTERNAL_BACKUP_SUMMARY_VERSION,
        size: file.size,
        mtime: file.mtime,
        counts,
      };
      await this.uiFileHelper.replaceInternalFileFromBlob(
        new Blob([JSON.stringify(summary)]),
        INTERNAL_BACKUP_SUMMARY,
        INTERNAL_BACKUP_SUMMARY_PART,
      );
    } catch (ex) {
      this.uiLog.error(
        'Internal backup - summary not written, the next start reads the file',
        ex,
      );
      try {
        await this.uiFileHelper.deleteInternalFile(INTERNAL_BACKUP_SUMMARY);
      } catch {
        // There is none, or it keeps the time of change of the file before.
      }
    }
  }
  private async __saveAutomaticBeanconquerorDump(_blob: Blob) {
    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;
    const brewsAdded: boolean = this.uiBrewStorage.getAllEntries().length > 0;
    if (welcomePagedShowed === true && brewsAdded === true) {
      this.uiLog.log('Start to export automatic ZIP file');
      try {
        await this.uiFileHelper.replaceFileFromBlob(
          _blob,
          'Download/Beanconqueror_export/Beanconqueror_automatic_export_' +
            this.getAutomatedBackupFilename() +
            '.zip',
          // The same on every day, so the next write removes what a write
          // of a day before left behind. Without the "_" that starts the
          // day, it is not listed as an automatic backup.
          'Download/Beanconqueror_export/Beanconqueror_automatic_export.zip.part',
          Directory.External,
        );
      } catch (ex) {
        this.uiLog.error('Could not to export automatic ZIP file');
        if (settings.show_backup_issues) {
          this.uiAlert.showMessage(
            'AUTOMATIC_BACKUP_DID_FAIL',
            'CARE',
            'OK',
            true,
          );
        }
      }
    }
  }
}
