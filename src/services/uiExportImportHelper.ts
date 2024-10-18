import { Injectable } from '@angular/core';
import { UISettingsStorage } from './uiSettingsStorage';
import { UIStorage } from './uiStorage';
import { UIHelper } from './uiHelper';
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
import { Directory } from '@capacitor/filesystem';
import { UILog } from './uiLog';
import { ModalController, Platform } from '@ionic/angular';
import { UIFileHelper } from './uiFileHelper';
import { UIAlert } from './uiAlert';
import moment from 'moment';
import { UIBrewStorage } from './uiBrewStorage';

import { DataCorruptionFoundComponent } from '../popover/data-corruption-found/data-corruption-found.component';

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
];

function chunkFileName(fileName: string, index: number): string {
  return `Beanconqueror_${fileName}_${index}.json`;
}

@Injectable({
  providedIn: 'root',
})
export class UIExportImportHelper {
  /**
   *
   */
  private isAppReady: number = -1;

  constructor(
    private readonly uiSettings: UISettingsStorage,
    public uiStorage: UIStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiLog: UILog,
    private readonly platform: Platform,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly modalController: ModalController
  ) {}

  public async buildExportZIP(): Promise<Blob> {
    const _data = await this.uiStorage.export();

    const mainJsonData = this.uiHelper.cloneData(_data);

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
      new TextReader(JSON.stringify(mainJsonData))
    );

    for (const chunk of chunkedData) {
      await zipWriter.add(
        chunk.fileName,
        new TextReader(JSON.stringify(chunk.content))
      );
    }

    const zipFileBlob = await zipWriter.close();
    return zipFileBlob;
  }

  public async getJSONFromZIPArrayBufferContent(
    _arrayBuffer: Uint8Array | ArrayBuffer
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
      (e) => e.filename === EXPORT_MAIN_FILE_NAME
    );
    if (foundGeneralEntry === undefined) {
      await zipReader.close();
      throw new Error(
        `ZIP file does not contain a ${EXPORT_MAIN_FILE_NAME} file`
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
          (e) => e.filename === chunkFileName(c.fileName, i)
        )) !== undefined
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

  private async checkBackupAndSeeIfDataAreCorrupted(_actualUIStorageDataObj) {
    try {
      this.uiLog.log(
        'checkBackupAndSeeIfDataAreCorrupted - Check if we got a deep corruption'
      );
      const dataObj = _actualUIStorageDataObj.DATA;
      const parsedJSON: any = await this.readBackupZIPFile();
      if (parsedJSON) {
        let somethingCorrupted = false;
        if (parsedJSON.BEANS?.length > dataObj.BEANS) {
          somethingCorrupted = true;
        } else if (parsedJSON.BREWS?.length > dataObj.BREWS) {
          somethingCorrupted = true;
        } else if (parsedJSON.PREPARATION?.length > dataObj.PREPARATION) {
          somethingCorrupted = true;
        } else if (parsedJSON.MILL?.length > dataObj.MILL) {
          somethingCorrupted = true;
        }

        this.uiLog.log(
          'checkBackupAndSeeIfDataAreCorrupted- Check over - if we got a deep corruption - Result: ' +
            somethingCorrupted
        );
        if (somethingCorrupted) {
          const importBackup = await this.showDataCorruptionPopover(
            dataObj,
            parsedJSON
          );
          if (importBackup) {
            await this.importBackupJSON(parsedJSON);
          }
        } else {
          this.uiLog.log(
            "checkBackupAndSeeIfDataAreCorrupted - Check over - we didn't find any corrupted data"
          );
        }
      } else {
        this.uiLog.log(
          "checkBackupAndSeeIfDataAreCorrupted - We didn't find any json backup data so we can't do any checks"
        );
      }
    } catch (ex) {
      this.uiLog.log(
        'Check over - if we got a deep corruption - Result exception: ' +
          JSON.stringify(ex)
      );
    }
  }

  public async showDataCorruptionPopover(
    _actualUIStorageDataObj: any,
    _backupDataObj: any
  ) {
    const modal = await this.modalController.create({
      component: DataCorruptionFoundComponent,
      id: DataCorruptionFoundComponent.POPOVER_ID,
      componentProps: {
        actualUIStorageDataObj: _actualUIStorageDataObj,
        backupDataObj: _backupDataObj,
      },
    });
    await modal.present();
    const returnData = await modal.onWillDismiss();
    this.uiLog.log(
      'Data corruption, choose to import: ' + returnData?.data?.import
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
      const hasData = await this.uiStorage.hasData();

      let actualUIStorageDataObj;
      if (hasData) {
        actualUIStorageDataObj = await this.uiStorage.hasCorruptedData();
      }

      this.uiLog.log('Check Backup - Has data ' + hasData);
      if (!hasData || actualUIStorageDataObj.CORRUPTED) {
        if (!hasData) {
          this.uiLog.log(
            'Check  Backup - We did not find any data inside the app, so try to find a backup and import it'
          );
        } else {
          this.uiLog.log(
            'Check  Backup - We found data but they where corrupted, so try to import a backup'
          );
        }

        const parsedJSON = await this.readBackupZIPFile();
        if (parsedJSON) {
          await this.importBackupJSON(parsedJSON);
        }
        return;
      }

      // hasData == true && actualUIStorageDataObj.CORRUPTED == false
      await this.checkBackupAndSeeIfDataAreCorrupted(actualUIStorageDataObj);
    } catch (error) {
      this.uiLog.error('Error while checking for backup data:', error);
    }
  }

  private importBackupJSON(_parsedJSON: unknown) {
    const promise = new Promise(async (resolve, reject) => {
      await this.uiAlert.showLoadingSpinner();

      this.uiStorage.import(_parsedJSON).then(
        async () => {
          this.uiLog.log('Sucessfully imported  Backup');
          setTimeout(() => {
            this.uiAlert.hideLoadingSpinner();
          }, 150);
          resolve(null);
        },
        () => {
          this.uiLog.error('Could not import  Backup');
          setTimeout(() => {
            this.uiAlert.hideLoadingSpinner();
          }, 150);
          resolve(null);
        }
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
            const parsedJSON = await this.getJSONFromZIPArrayBufferContent(
              _arrayBuffer
            );
            resolve(parsedJSON);
          } catch (ex) {
            resolve(null);
          }
        },
        () => {
          this.uiLog.log(
            `Read ZIP-FILE failed, try to read an old ${EXPORT_MAIN_FILE_NAME}`
          );
          this.uiFileHelper.readInternalJSONFile(EXPORT_MAIN_FILE_NAME).then(
            async (_json) => {
              this.uiLog.log('Read ZIP-File, we found an json-file');
              resolve(_json);
            },
            () => {
              this.uiLog.log(
                'Check Backup - We couldnt retrieve any JSON file'
              );
              resolve(null);
            }
          );
        }
      );
    });
    return promise;
  }

  private getAutomatedBackupFilename(): string {
    return moment().format('DD_MM_YYYY').toString();
  }
  private getAutomatedBackupFilenameHours(): string {
    return moment().format('DD_MM_YYYY_HH_mm').toString();
  }

  public async saveAutomaticBackups() {
    this.buildExportZIP().then(
      async (_blob) => {
        try {
          this.__saveInternalBeanconquerorDump(_blob);
          this.__saveAutomaticBeanconquerorDump(_blob);
        } catch (ex) {
          this.uiLog.error('ZIP file could not be saved');
          const settings = this.uiSettingsStorage.getSettings();
          if (settings.show_backup_issues) {
            this.uiAlert.showMessage(
              'ZIP_BACKUP_FILE_COULD_NOT_BE_BUILD',
              'CARE',
              'OK',
              true
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
            true
          );
        }
      }
    );
  }
  private async __saveInternalBeanconquerorDump(_blob: Blob) {
    try {
      await this.uiFileHelper.writeInternalFileFromBlob(
        _blob,
        'Beanconqueror.zip'
      );
    } catch (ex) {
      this.uiLog.error('Could not to export normal ZIP file');
      const settings = this.uiSettingsStorage.getSettings();
      if (settings.show_backup_issues) {
        this.uiAlert.showMessage(
          'INTERNAL_BACKUP_DID_FAIL',
          'CARE',
          'OK',
          true
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
          Directory.External
        );
      } catch (ex) {
        this.uiLog.error('Could not to export automatic ZIP file');
        if (settings.show_backup_issues) {
          this.uiAlert.showMessage(
            'AUTOMATIC_BACKUP_DID_FAIL',
            'CARE',
            'OK',
            true
          );
        }
      }
    }
  }
}
