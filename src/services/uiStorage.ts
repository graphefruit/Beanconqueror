/**  Core */
import { Injectable } from '@angular/core';
/**
 * Ionic native
 *
 */
import { Storage } from '@ionic/storage';
import { EventQueueService } from './queueService/queue-service.service';
import { AppEvent } from '../classes/appEvent/appEvent';
import { AppEventType } from '../enums/appEvent/appEvent';
import { Platform } from '@ionic/angular';
import { UILog } from './uiLog';
import { UIAlert } from './uiAlert';

declare var NativeStorage;

@Injectable({
  providedIn: 'root',
})
export class UIStorage {
  private _storage: Storage | null = null;
  private useNativeStorage = false;

  constructor(
    private readonly storage: Storage,
    private eventQueue: EventQueueService,
    private readonly platform: Platform,
    private readonly uiLog: UILog,
    private readonly uiAlert: UIAlert
  ) {}

  public async init() {
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    const createdStorage = await this.storage.create();
    this._storage = createdStorage;
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      this.uiLog.log('UIStorage - Initialize Native Storage');
      await this.initializeBeanconquerorNativeStorage();
    }
    this.uiLog.log('UIStorage - Everything finished, done now');
  }

  private async initializeBeanconquerorNativeStorage() {
    try {
      NativeStorage.initWithSuiteName('banconqueror');
    } catch (ex) {}
    const beanconquerorStorageKey: string = 'BeanconquerorStorage';
    this.uiLog.log('UIStorage - Check if we already have the Native Storage');
    const nativeStorageExisting: boolean = await new Promise(
      async (resolve, reject) => {
        NativeStorage.getItem(
          beanconquerorStorageKey,
          (_data) => {
            resolve(true);
          },
          (_error) => {
            resolve(false);
          }
        );
      }
    );

    this.uiLog.log('UIStorage - Check result: ' + nativeStorageExisting);
    if (nativeStorageExisting === false) {
      await this.uiAlert.showLoadingSpinner('', false);
      this.uiLog.log(
        'UIStorage - We dont have changed to native storage right now'
      );
      let allDataSet: boolean = true;
      const exportObj = {};
      this.uiLog.log('UIStorage - Retrieve all storage data');
      await this.storage.forEach((_value, _key, _index) => {
        exportObj[_key] = _value;
      });
      this.uiLog.log(
        'UIStorage - All data storages recieved, iterate now through all'
      );
      const keys = Object.keys(exportObj);
      for await (const _val of keys) {
        const imported: boolean = await this.importToNativeStorage(
          _val,
          exportObj[_val]
        );
        if (!imported) {
          allDataSet = false;
        }
      }
      if (allDataSet === true) {
        //If we set everything until here, we now can set the beanconqueror storage aswell.
        await new Promise(async (resolve, reject) => {
          this.uiLog.log(
            'UIStorage - Set key: ' + beanconquerorStorageKey + ' Val: true'
          );
          NativeStorage.setItem(
            beanconquerorStorageKey,
            true,
            () => {
              this.uiLog.log(
                'UIStorage - Set succesfully: ' + beanconquerorStorageKey
              );
              resolve(true);
            },
            () => {
              this.uiLog.log(
                'UIStorage - Set failed: ' + beanconquerorStorageKey
              );
              allDataSet = false;
              resolve(false);
            }
          );
        });
      }
      // @ts-ignore
      if (allDataSet === true) {
        this.uiLog.log(
          'UIStorage - Native Storage - All data could be set, ignore now the IndexedDB'
        );
        this.useNativeStorage = true;
      } else {
        NativeStorage.clear(
          beanconquerorStorageKey,
          () => {},
          () => {}
        );
        this.uiLog.log(
          'UIStorage - Native Storage - Not all data could be set, clear data again, use still the IndexedDB'
        );
      }
      this.uiAlert.hideLoadingSpinner();
      //Fetch one time the data from the database and sync it here.
    } else {
      this.useNativeStorage = true;
      this.uiLog.log('UIStorage - Native Storage - We already have all data');
    }
  }
  private importToNativeStorage(_key, _val): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      this.uiLog.log('UIStorage - Set key: ' + _key);
      NativeStorage.setItem(
        'Beanconqueror' + _key,
        _val,
        () => {
          this.uiLog.log('UIStorage - Set succesfully: ' + _key);
          resolve(true);
        },
        () => {
          this.uiLog.log('UIStorage - Set failed: ' + _key);

          resolve(false);
        }
      );
    });
  }

  public async set(_key: string, _val: any): Promise<boolean> {
    const promise = new Promise<boolean>(async (resolve, reject) => {
      this.eventQueue.dispatch(
        new AppEvent(AppEventType.STORAGE_CHANGED, undefined)
      );
      try {
        if (this.useNativeStorage) {
          await new Promise(async (_interalResolve, _interalReject) => {
            NativeStorage.setItem(
              'Beanconqueror' + _key,
              _val,
              () => {
                _interalResolve(true);
              },
              () => {
                _interalReject(false);
              }
            );
          });
        } else {
          await this.storage.set(_key, _val);
        }
        resolve(true);
      } catch (ex) {
        reject(ex);
      }
    });
    return promise;
  }

  public async get(_key): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      // We didn't wait here, maybe this will fix some issues :O?
      try {
        if (this.useNativeStorage) {
          let dataNativeStorage = null;
          await new Promise(async (_interalResolve, _interalReject) => {
            NativeStorage.getItem(
              'Beanconqueror' + _key,
              (_val) => {
                dataNativeStorage = _val;
                _interalResolve(true);
              },
              () => {
                _interalReject(false);
              }
            );
          });
          resolve(dataNativeStorage);
        } else {
          const data = await this.storage.get(_key);
          resolve(data);
        }
      } catch (ex) {
        resolve(null);
      }
    });
    return promise;
  }

  public async export(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const exportObj = {};

      if (this.useNativeStorage) {
        const dbEntries = [
          'BEANS',
          'BREWS',
          'GRAPH',
          'GREEN_BEANS',
          'MILL',
          'PREPARATION',
          'ROASTING_MACHINES',
          'SETTINGS',
          'VERSION',
          'WATER',
        ];

        for await (const _val of dbEntries) {
          this.uiLog.log('UIStorage - Export - Get: ' + _val);
          const data: any = await this.get(_val);
          exportObj[_val] = data;
        }
        if (exportObj && 'SETTINGS' in exportObj) {
          exportObj['SETTINGS'][0].visualizer_username = '';
          exportObj['SETTINGS'][0].visualizer_password = '';
        }
        resolve(exportObj);
      } else {
        this.storage
          .forEach((_value, _key, _index) => {
            exportObj[_key] = _value;
          })
          .then(() => {
            // #520 - Remove username and password before export.
            if (exportObj && 'SETTINGS' in exportObj) {
              exportObj['SETTINGS'][0].visualizer_username = '';
              exportObj['SETTINGS'][0].visualizer_password = '';
            }
            resolve(exportObj);
          });
      }
    });

    return promise;
  }

  public clearStorage() {
    if (this.useNativeStorage) {
      NativeStorage.clear();
    } else {
      this.storage.clear();
    }
  }

  public async hasData(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      let hasData: boolean = false;
      if (this.useNativeStorage) {
        NativeStorage.getItem(
          'BeanconquerorVERSION',
          (_data) => {
            resolve(true);
          },
          (_error) => {
            resolve(false);
          }
        );
      } else {
        this.storage
          .forEach((_value, _key, _index) => {
            if (_key === 'VERSION') {
              try {
                if (
                  _value?.length > 0 &&
                  _value[0]['updatedDataVersions'].length > 0
                ) {
                  hasData = true;
                  return true;
                }
              } catch (ex) {}
            }
          })
          .then(
            () => {
              if (hasData) {
                resolve(true);
              } else {
                resolve(false);
              }
            },
            () => {
              resolve(false);
            }
          );
      }
    });

    return promise;
  }

  public async import(_data: any): Promise<any> {
    // Before we import, we do a saftey backup
    const promise = new Promise((resolve, reject) => {
      this.__safteyBackup().then((_backup) => {
        this.__importBackup(_data).then(
          () => {
            // Successfully imported backup
            resolve({ BACKUP: false });
          },
          () => {
            this.__importBackup(_backup).then(
              () => {
                resolve({ BACKUP: true });
              },
              () => {
                reject({ BACKUP: true });
              }
            );
          }
        );
      });
    });

    return promise;
  }

  private async __safteyBackup(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.export().then((_data) => {
        resolve(_data);
      });
    });

    return promise;
  }

  private async __importBackup(_data): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const keysCount: number = Object.keys(_data).length;
      let finishedImport: number = 0;

      let nativeStorageImportIssue: boolean = false;
      for (const key in _data) {
        if (_data.hasOwnProperty(key)) {
          if (this.useNativeStorage) {
            this.uiLog.log('UIStorage - Import backup');
            try {
              this.uiLog.log('UIStorage - Import backup Key ' + key);
              await this.set(key, _data[key]);
              this.uiLog.log(
                'UIStorage - Import backup Key ' + key + ' success'
              );
            } catch (ex) {
              this.uiLog.error(
                'UIStorage - Import backup Key ' + key + ' not possible'
              );
              nativeStorageImportIssue = true;
            }
            if (nativeStorageImportIssue === false) {
              this.uiLog.log('UIStorage - Import backup all imported');
              resolve(undefined);
            } else {
              this.uiLog.log('UIStorage - Import backup not all imported');
              reject();
            }
          } else {
            this.storage.set(key, _data[key]).then(
              () => {
                finishedImport++;
                if (keysCount === finishedImport) {
                  resolve(undefined);
                }
              },
              () => {
                reject();
              }
            );
          }
        }
      }
    });

    return promise;
  }
}
