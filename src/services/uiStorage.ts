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

@Injectable({
  providedIn: 'root',
})
export class UIStorage {
  private _storage: Storage | null = null;
  constructor(
    private readonly storage: Storage,
    private eventQueue: EventQueueService
  ) {
    this.init();
  }
  private async init() {
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    const createdStorage = await this.storage.create();
    this._storage = createdStorage;
  }

  public async set(_key: string, _val: any): Promise<boolean> {
    const promise = new Promise<boolean>(async (resolve, reject) => {
      this.eventQueue.dispatch(
        new AppEvent(AppEventType.STORAGE_CHANGED, undefined)
      );
      try {
        const data = await this.storage.set(_key, _val);
        resolve(true);
      } catch (ex) {
        resolve(true);
      }
    });
    return promise;
  }

  public async get(_key): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      // We didn't wait here, maybe this will fix some issues :O?
      try {
        const data = await this.storage.get(_key);
        resolve(data);
      } catch (ex) {
        resolve(null);
      }
    });
    return promise;
  }

  public async export(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const exportObj = {};

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
    });

    return promise;
  }

  public clearStorage() {
    this.storage.clear();
  }
  public async hasData(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      let hasData: boolean = false;
      this.storage
        .forEach((_value, _key, _index) => {
          if (_key === 'VERSION') {
            try {
              if (
                _value?.length > 0 ||
                _value['updatedDataVersions'].length > 0
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
    const promise = new Promise((resolve, reject) => {
      const keysCount: number = Object.keys(_data).length;
      let finishedImport: number = 0;
      for (const key in _data) {
        if (_data.hasOwnProperty(key)) {
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
    });

    return promise;
  }
}
