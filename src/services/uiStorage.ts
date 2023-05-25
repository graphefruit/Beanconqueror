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
  constructor(
    private readonly storage: Storage,
    private eventQueue: EventQueueService
  ) {}

  public async set(_key: string, _val: any): Promise<boolean> {
    const promise = new Promise<boolean>((resolve, reject) => {
      this.storage.ready().then(
        async () => {
          this.eventQueue.dispatch(
            new AppEvent(AppEventType.STORAGE_CHANGED, undefined)
          );
          const data = await this.storage.set(_key, _val);
          resolve(true);
        },
        (e) => {
          reject(e);
        }
      );
    });
    return promise;
  }

  public async get(_key): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.storage.ready().then(
        async () => {
          // We didn't wait here, maybe this will fix some issues :O?
          const data = await this.storage.get(_key);
          resolve(data);
        },
        (e) => {
          reject(e);
        }
      );
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
          resolve(exportObj);
        });
    });

    return promise;
  }

  public async hasData(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      let hasData: boolean = false;
      this.storage
        .forEach((_value, _key, _index) => {
          if (_key === 'SETTINGS' || _key === 'VERSION') {
            //Settings and version will be set realy early... so we don't relay on those
          } else {
            hasData = true;
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
