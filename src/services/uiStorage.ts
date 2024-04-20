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
import { UILog } from './uiLog';
import { UIAlert } from './uiAlert';

@Injectable({
  providedIn: 'root',
})
export class UIStorage {
  private _storage: Storage | null = null;

  constructor(
    private readonly storage: Storage,
    private eventQueue: EventQueueService,
    private readonly uiLog: UILog,
    private readonly uiAlert: UIAlert
  ) {}

  public async init() {
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    this._storage = await this.storage.create();
  }

  public getStorage() {
    return this._storage;
  }

  private async reinitializeStorage() {
    try {
      this.uiLog.log('UIStorage - ReinitializeStorage - Start');
      await this.init();
      this.uiLog.log('UIStorage - ReinitializeStorage - Ended successfully');
    } catch (ex) {
      this.uiLog.error(
        'UIStorage - ReinitializeStorage - Issue occured ' +
          JSON.stringify(ex.message)
      );
    }
  }

  public async set(_key: string, _val: any): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      let whileCounter = 0;
      while (true) {
        try {
          this.uiLog.log(
            'UIStorage - Set Key - ' + _key + ' start counter:' + whileCounter
          );
          await this.internalSet(_key, _val);
          this.uiLog.log('UIStorage - Set Key - ' + _key + ' successfully');
          resolve(true);
          // Break out of the loop now.
          return;
        } catch (ex) {
          // We could not access the database... do it again.
          this.uiLog.error(
            'UIStorage - Set Key - ' + _key + ' exception ' + JSON.stringify(ex)
          );
          await new Promise(async (_internalResolve) => {
            setTimeout(() => {
              _internalResolve(undefined);
            }, 100);
          });
          whileCounter++;
          if (whileCounter === 11) {
            this.uiLog.error(
              'UIStorage - Set Key - ' +
                _key +
                ' we try to reconnect to the database and hopefully fix all issues'
            );
            await this.reinitializeStorage();
          } else if (whileCounter >= 20) {
            this.uiLog.error(
              'UIStorage - Set Key - ' +
                _key +
                ' we stop to try getting data now 20 attempts are enough - show error'
            );
            await this.uiAlert.showMessageNoButton(
              'IOS_DATABASE_ISSUE_DESCRIPTION',
              'IOS_DATABASE_ISSUE_TITLE',
              true
            );
            reject(ex);
            return;
          }
        }
      }
    });
    return promise;
  }

  private async internalSet(_key: string, _val: any): Promise<boolean> {
    const promise: Promise<boolean> = new Promise<boolean>(
      async (resolve, reject) => {
        try {
          await this._storage.set(_key, _val);
          // We just trigger storage change when the set was successfully.
          this.eventQueue.dispatch(
            new AppEvent(AppEventType.STORAGE_CHANGED, undefined)
          );
          resolve(true);
        } catch (ex) {
          reject(ex);
        }
      }
    );
    return promise;
  }

  private async internalGet(_key) {
    const promise = new Promise(async (resolve, reject) => {
      // We didn't wait here, maybe this will fix some issues :O?
      try {
        const data = await this._storage.get(_key);
        resolve(data);
      } catch (ex) {
        reject(ex);
      }
    });
    return promise;
  }

  public async get(_key): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      let whileCounter = 0;
      while (true) {
        try {
          this.uiLog.log(
            'UIStorage - Get Key - ' + _key + ' start counter:' + whileCounter
          );
          const data = await this.internalGet(_key);
          this.uiLog.log('UIStorage - Get Key - ' + _key + ' successfully');
          resolve(data);
          // Break out of the loop now.
          return;
        } catch (ex) {
          // We could not access the database... do it again.
          this.uiLog.error(
            'UIStorage - Get Key - ' + _key + ' exception ' + JSON.stringify(ex)
          );
          await new Promise(async (_internalResolve) => {
            setTimeout(() => {
              _internalResolve(undefined);
            }, 100);
          });
          whileCounter++;
          if (whileCounter === 11) {
            await this.reinitializeStorage();
            this.uiLog.error(
              'UIStorage - Get Key - ' +
                _key +
                ' we try to reconnect to the database and hopefully fix all issues'
            );
          } else if (whileCounter >= 20) {
            this.uiLog.error(
              'UIStorage - Get Key - ' +
                _key +
                ' we stop to try getting data now 20 attempts are enough - show error'
            );
            await this.uiAlert.showMessageNoButton(
              'IOS_DATABASE_ISSUE_DESCRIPTION',
              'IOS_DATABASE_ISSUE_TITLE',
              true
            );
            resolve(null);
            return;
          }
        }
      }
    });
    return promise;
  }

  public async export(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const exportObj = {};

      this._storage
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
    this._storage.clear();
  }

  public async hasData(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      let hasData: boolean = false;
      this._storage
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
          this._storage.set(key, _data[key]).then(
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
