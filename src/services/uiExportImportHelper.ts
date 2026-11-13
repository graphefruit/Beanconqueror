import { inject, Injectable } from '@angular/core';

import { ModalController, Platform } from '@ionic/angular/standalone';

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
import { LOCAL_ONLY_STORAGE_KEYS } from '../classes/changeTracking/localStorageKeys';
import { withoutSettingsSecrets } from '../classes/settings/settingsSecrets';
import { RESTORE_SOURCE } from '../interfaces/changeTracking/iRestoreNote';
import { DataCorruptionFoundComponent } from '../popover/data-corruption-found/data-corruption-found.component';
import {
  PreImportBackupError,
  PreImportBackupService,
} from './preImportBackup/pre-import-backup.service';
import { UIAlert } from './uiAlert';
import { UIBrewStorage } from './uiBrewStorage';
import { UIFileHelper } from './uiFileHelper';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIStorage } from './uiStorage';

const EXPORT_MAIN_FILE_NAME = 'Beanconqueror.json';
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

/** Whether stored values (UIStorage.export()) hold settings or entries. */
function holdsDataToSave(_stored: any): boolean {
  return ['SETTINGS', ...CHANGE_TRACKED_COLLECTIONS].some(
    (_key) => Array.isArray(_stored?.[_key]) && _stored[_key].length > 0,
  );
}

@Injectable({
  providedIn: 'root',
})
export class UIExportImportHelper {
  private readonly uiSettings = inject(UISettingsStorage);
  uiStorage = inject(UIStorage);
  private readonly uiHelper = inject(UIHelper);
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
   * After a completed import, only the newest backups are kept. A failed
   * import removes none, so the file it was started from stays available.
   */
  public async importBackup(
    _data: unknown,
    _source: RESTORE_SOURCE,
  ): Promise<{ BACKUP: boolean }> {
    const written = await this.__writeBackupBeforeImport();
    const result: { BACKUP: boolean } = await this.uiStorage.import(
      _data,
      _source,
    );
    if (written !== undefined && result?.BACKUP === false) {
      await this.preImportBackup.removeOldBackups(written);
    }
    return result;
  }

  /**
   * Resolves the path of the written file, nothing when none is needed.
   * Whether there is data to save is decided on the values the file is
   * written from, so data that cannot be read stops the import instead of
   * being taken for none.
   */
  private async __writeBackupBeforeImport(): Promise<string | undefined> {
    if (!this.preImportBackup.isAvailable()) {
      this.uiLog.info(
        'Backup before import - skipped, there is no file system in the browser',
      );
      return undefined;
    }
    try {
      const stored = await this.uiStorage.export();
      if (!holdsDataToSave(stored)) {
        this.uiLog.info('Backup before import - skipped, no data stored');
        return undefined;
      }
      const written = await this.preImportBackup.write(
        await this.buildExportZIP(stored),
      );
      this.uiLog.log(`Backup before import - written to ${written}`);
      return written;
    } catch (ex) {
      this.uiLog.error(
        'Backup before import - could not be written, nothing is imported',
        ex,
      );
      throw new PreImportBackupError(ex);
    }
  }

  /**
   * `_stored` are the values of UIStorage.export() when the caller already
   * read them; otherwise they are read here.
   */
  public async buildExportZIP(_stored?: any): Promise<Blob> {
    const _data = _stored ?? (await this.uiStorage.export());

    const mainJsonData = this.uiHelper.cloneData(_data);
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
      const hasData = await this.uiStorage.hasData();

      let actualUIStorageDataObj;
      if (hasData) {
        actualUIStorageDataObj = await this.uiStorage.hasCorruptedData();
      }

      const { fileData, isAutomaticBackup }: any =
        await this.__getBiggerFileBackupOrAutomatic();

      if (fileData) {
        // Counted as an import would store it: after the copies of entries
        // sharing a uuid were cleaned up, a backup written before has more
        // entries than the device, although nothing was lost. The device is
        // counted the same way (UIStorage.hasCorruptedData), so copies it
        // still stores before the cleanup do not hide a lost entry either.
        this.uiStorage.removeDuplicateEntries(fileData);
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
          let somethingCorrupted = false;
          if (dataObj) {
            if (fileData.BEANS?.length > dataObj.BEANS) {
              somethingCorrupted = true;
            } else if (fileData.BREWS?.length > dataObj.BREWS) {
              somethingCorrupted = true;
            } else if (fileData.PREPARATION?.length > dataObj.PREPARATION) {
              somethingCorrupted = true;
            } else if (fileData.MILL?.length > dataObj.MILL) {
              somethingCorrupted = true;
            }
          } else {
            //We got no data object, so we assume that the data is corrupted, and its likely to be now and automatic backup, else the first if would be jumped
            somethingCorrupted = true;
          }

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

  private importBackupJSON(_parsedJSON: unknown) {
    const promise = new Promise(async (resolve, reject) => {
      await this.uiAlert.showLoadingSpinner();

      this.importBackup(_parsedJSON, 'internal_backup').then(
        async () => {
          this.uiLog.log('Sucessfully imported  Backup');
          setTimeout(() => {
            this.uiAlert.hideLoadingSpinner();
          }, 150);
          resolve(null);
        },
        async (_error: unknown) => {
          this.uiLog.error('Could not import  Backup');
          if (_error instanceof PreImportBackupError) {
            // Nothing was imported, the app starts with the stored data.
            try {
              await this.uiAlert.hideLoadingSpinner();
              await this.uiAlert.showMessage(
                'PRE_IMPORT_BACKUP_FAILED',
                undefined,
                undefined,
                true,
              );
            } finally {
              resolve(null);
            }
            return;
          }
          setTimeout(() => {
            this.uiAlert.hideLoadingSpinner();
          }, 150);
          resolve(null);
        },
      );
    });
    return promise;
  }

  private readBackupZIPFile() {
    // If we don't got any data, we check now if there is a Beanconqueror.zip saved.
    const promise = new Promise(async (resolve, reject) => {
      this.uiFileHelper.readInternalFileAsUint8Array('Beanconqueror.zip').then(
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

  public async saveAutomaticBackups() {
    this.buildExportZIP().then(
      async (_blob) => {
        try {
          const hasData = await this.uiStorage.hasData();

          let actualUIStorageDataObj;
          if (hasData) {
            actualUIStorageDataObj = await this.uiStorage.hasCorruptedData();
          }
          if (hasData && !actualUIStorageDataObj.CORRUPTED) {
            this.uiLog.debug('Start writing automatic backups');
            this.__saveInternalBeanconquerorDump(_blob);
            this.__saveAutomaticBeanconquerorDump(_blob);
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
  private async __saveInternalBeanconquerorDump(_blob: Blob) {
    try {
      await this.uiFileHelper.writeInternalFileFromBlob(
        _blob,
        'Beanconqueror.zip',
      );
    } catch (ex) {
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
  private async __saveAutomaticBeanconquerorDump(_blob: Blob) {
    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;
    const brewsAdded: boolean = this.uiBrewStorage.getAllEntries().length > 0;
    if (welcomePagedShowed === true && brewsAdded === true) {
      this.uiLog.log('Start to export automatic ZIP file');
      try {
        await this.uiFileHelper.writeFileFromBlob(
          _blob,
          'Download/Beanconqueror_export/Beanconqueror_automatic_export_' +
            this.getAutomatedBackupFilename() +
            '.zip',
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
