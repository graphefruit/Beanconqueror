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
  EntryMetaData,
  TextReader,
  TextWriter,
  ZipEntry,
  ZipFileEntry,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import * as zip from '@zip.js/zip.js';
import { FileEntry } from '@awesome-cordova-plugins/file';
import { UILog } from './uiLog';
import { ModalController, Platform } from '@ionic/angular';
import { UIFileHelper } from './uiFileHelper';
import { UIAlert } from './uiAlert';
import moment from 'moment';
import { UIBrewStorage } from './uiBrewStorage';

import { DataCorruptionFoundComponent } from '../popover/data-corruption-found/data-corruption-found.component';
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

  public async buildExportZIP(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiStorage.export().then(async (_data) => {
        try {
          const clonedData = this.uiHelper.cloneData(_data);
          const brewChunks = [];
          if (clonedData?.BREWS?.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < clonedData.BREWS.length; i += chunkSize) {
              const chunk = clonedData.BREWS.slice(i, i + chunkSize);
              brewChunks.push(chunk);
            }
          }

          const beanChunks = [];
          if (clonedData?.BEANS?.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < clonedData.BEANS.length; i += chunkSize) {
              const chunk = clonedData.BEANS.slice(i, i + chunkSize);
              beanChunks.push(chunk);
            }
          }

          const originalJSON = this.uiHelper.cloneData(_data);
          if (brewChunks.length > 0) {
            originalJSON.BREWS = brewChunks[0];
          }
          if (beanChunks.length > 0) {
            originalJSON.BEANS = beanChunks[0];
          }

          const zipFileWriter = new BlobWriter();
          const beanconquerorJSON = new TextReader(
            JSON.stringify(originalJSON)
          );
          let zipWriter;
          if (this.platform.is('ios')) {
            // iOS got corrupt zip file, when compression is used, removing this, results into a bigger zip file, but leads into a working zip file again.
            zip.configure({ useCompressionStream: false });
            zipWriter = new ZipWriter(zipFileWriter);
          } else {
            zipWriter = new ZipWriter(zipFileWriter);
          }

          await zipWriter.add('Beanconqueror.json', beanconquerorJSON);

          for (let i = 1; i < brewChunks.length; i++) {
            const beanconquerorBrewJSON = new TextReader(
              JSON.stringify(brewChunks[i])
            );
            await zipWriter.add(
              'Beanconqueror_Brews_' + i + '.json',
              beanconquerorBrewJSON
            );
          }

          for (let i = 1; i < beanChunks.length; i++) {
            const beanconquerorBeanJSON = new TextReader(
              JSON.stringify(beanChunks[i])
            );
            await zipWriter.add(
              'Beanconqueror_Beans_' + i + '.json',
              beanconquerorBeanJSON
            );
          }
          const zipFileBlob = await zipWriter.close();
          resolve(zipFileBlob);
        } catch (ex) {
          reject();
        }
      });
    });
  }

  public async getJSONFromZIPArrayBufferContent(_arrayBuffer): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const readBlob = new Blob([_arrayBuffer], {
          type: 'application/zip',
        });

        const zipFileReader = new BlobReader(readBlob);

        // Creates a ZipReader object reading the zip content via `zipFileReader`,
        // retrieves metadata (name, dates, etc.) of the first entry, retrieves its
        // content via `helloWorldWriter`, and closes the reader.
        const zipReader = new ZipReader(zipFileReader);

        const entries: Array<any> = await zipReader.getEntries();
        const entriesLength = entries.length;

        let importJSONData = undefined;

        if (entriesLength > 0) {
          const foundGeneralEntry = entries.find(
            (e) => e.filename === 'Beanconqueror.json'
          );
          if (foundGeneralEntry === undefined) {
            await zipReader.close();
            reject();
            return;
          }

          const generalWriter = new TextWriter();
          const generalImportText = await foundGeneralEntry.getData(
            generalWriter
          );
          importJSONData = JSON.parse(generalImportText);

          if (
            importJSONData &&
            importJSONData?.BREWS &&
            importJSONData.BREWS?.length > 0
          ) {
          } else {
            importJSONData.BREWS = [];
          }
          //We just iterate through all the lengths, even tho, its splitted
          // between brews and beans, but we always start from 1, so even when we don't find a 7 or 8, we found them on the beans
          for (let i = 1; i < entriesLength; i++) {
            const brewEntry = entries.find(
              (e) => e.filename === 'Beanconqueror_Brews_' + i + '.json'
            );
            if (brewEntry) {
              this.uiLog.log(
                'Found - Beanconqueror_Brews_' + i + '.json - Import'
              );
              const brewWriter = new TextWriter();
              const brewImportText = await brewEntry.getData(brewWriter);
              const parsedBrews = JSON.parse(brewImportText);
              importJSONData.BREWS.push(...parsedBrews);
            }
          }

          if (
            importJSONData &&
            importJSONData?.BEANS &&
            importJSONData.BEANS?.length > 0
          ) {
          } else {
            importJSONData.BEANS = [];
          }

          for (let i = 1; i < entriesLength; i++) {
            const beanEntry = entries.find(
              (e) => e.filename === 'Beanconqueror_Beans_' + i + '.json'
            );
            if (beanEntry) {
              this.uiLog.log(
                'Found - Beanconqueror_Beans_' + i + '.json - Import'
              );
              const beanWriter = new TextWriter();
              const beanImportText = await beanEntry.getData(beanWriter);
              const parsedBeans = JSON.parse(beanImportText);
              importJSONData.BEANS.push(...parsedBeans);
            }
          }

          await zipReader.close();
          resolve(importJSONData);
        }
      } catch (ex) {
        reject();
      }
    });
  }

  public async importZIPFile(_fileEntry: FileEntry): Promise<any> {
    return new Promise((resolve, reject) => {
      _fileEntry.file(async (file) => {
        try {
          const reader = new FileReader();
          reader.onloadend = async (event: Event) => {
            try {
              const parsedJSON = await this.getJSONFromZIPArrayBufferContent(
                reader.result as any
              );
              resolve(parsedJSON);
            } catch (ex) {
              reject();
            }
          };
          reader.onerror = (event: Event) => {
            reject();
          };

          reader.readAsArrayBuffer(file);
        } catch (ex) {
          reject();
        }
      });
    });
  }
  private async checkBackupAndSeeIfDataAreCorrupted(_actualUIStorageDataObj) {

    try {
      this.uiLog.log("checkBackupAndSeeIfDataAreCorrupted - Check if we got a deep corruption");
      const dataObj = _actualUIStorageDataObj.DATA;
      const parsedJSON: any = await this.readBackupZIPFile();
      if (parsedJSON) {
        let somethingCorrupted = false;
        if (parsedJSON.BEANS?.length > dataObj.BEANS) {
          somethingCorrupted = true;
        } else if (parsedJSON.BREWS?.length > dataObj.BREWS)
        {
          somethingCorrupted = true;
        } else if (parsedJSON.PREPARATION?.length > dataObj.PREPARATION)
        {
          somethingCorrupted = true;
        }
        else if (parsedJSON.MILL?.length > dataObj.MILL)
        {
          somethingCorrupted = true;
        }

        this.uiLog.log("checkBackupAndSeeIfDataAreCorrupted- Check over - if we got a deep corruption - Result: " + somethingCorrupted);
        if (somethingCorrupted) {
          const importBackup = await this.showDataCorruptionPopover(dataObj,parsedJSON);
          if (importBackup) {
            await this.importBackupJSON(parsedJSON);
          }
        } else {
          this.uiLog.log("checkBackupAndSeeIfDataAreCorrupted - Check over - we didn't find any corrupted data");
        }
      } else {
        this.uiLog.log("checkBackupAndSeeIfDataAreCorrupted - We didn't found any json backup data so we can't do any checks");
      }
    } catch(ex) {
      this.uiLog.log("Check over - if we got a deep corruption - Result exception: " + JSON.stringify(ex));
    }

  }

  public async showDataCorruptionPopover(_actualUIStorageDataObj,_backupDataObj) {
    const modal = await this.modalController.create({
      component: DataCorruptionFoundComponent,
      id: DataCorruptionFoundComponent.POPOVER_ID,
      componentProps: {
        actualUIStorageDataObj: _actualUIStorageDataObj,
        backupDataObj: _backupDataObj,
      },
    });
    await modal.present();
    const returnData  = await modal.onWillDismiss();
    this.uiLog.log('Data corruption, choose to import: ' + returnData?.data?.import);
    if (returnData?.data?.import) {
      //User choose to import backup, go
      return true;
    }
    return false;
  }

  public async checkBackup() {
    try {
      const promise = new Promise(async (resolve, reject) => {
        try {
          if (this.platform.is('cordova')) {
            this.uiLog.log('Check Backup');
            const hasData = await this.uiStorage.hasData();

            let actualUIStorageDataObj: any;
            if (hasData) {
              actualUIStorageDataObj = await this.uiStorage.hasCorruptedData();
            }

            this.uiLog.log('Check Backup - Has data ' + hasData);
            if (!hasData || actualUIStorageDataObj.CORRUPTED) {
              if (!hasData) {
                this.uiLog.log(
                  'Check  Backup - We didnt found any data inside the app, so try to find a backup and import it'
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
              resolve(null);
            } else {
              await this.checkBackupAndSeeIfDataAreCorrupted(actualUIStorageDataObj);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (ex) {
          resolve(null);
        }
      });
      return promise;
    } catch (ex) {}
  }

  private importBackupJSON(_parsedJSON) {
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
      this.uiFileHelper.getZIPFile('Beanconqueror.zip').then(
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
            'Read ZIP-FILE failed, try to read an old Beanconqueror.json'
          );
          this.uiFileHelper.getJSONFile('Beanconqueror.json').then(
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
  private async __saveInternalBeanconquerorDump(_blob) {
    try {
      const file: FileEntry = await this.uiFileHelper.saveZIPFile(
        'Beanconqueror.zip',
        _blob
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
  private async __saveAutomaticBeanconquerorDump(_blob) {
    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;
    const brewsAdded: boolean = this.uiBrewStorage.getAllEntries().length > 0;
    if (welcomePagedShowed === true && brewsAdded === true) {
      this.uiLog.log('Start to export automatic ZIP file');
      try {
        const file: FileEntry = await this.uiFileHelper.saveZIPFile(
          'Download/Beanconqueror_export/Beanconqueror_automatic_export_' +
            this.getAutomatedBackupFilename() +
            '.zip',
          _blob
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
