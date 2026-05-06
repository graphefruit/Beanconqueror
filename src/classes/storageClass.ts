import { inject } from '@angular/core';

import { cloneDeep } from 'lodash';
import { Observable, Subject } from 'rxjs';

import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';

export abstract class StorageClass {
  protected uiStorage = inject(UIStorage);
  protected uiLog = inject(UILog);

  private removeObjSubject = new Subject<any>();
  private eventSubject = new Subject<any>();
  public readonly DB_PATH: string;
  protected storedData: Array<any> = [];

  /**
   * -1 = Nothing started
   * 0 = Error occured
   * 1 = Initialized
   */
  private isInitialized: number = -1;

  protected constructor(protected dbPath: string) {
    this.DB_PATH = dbPath;
  }

  public static cloneData<T>(value: T): T {
    return cloneDeep(value);
  }

  // Equivalent to moment().unix() — not worth the import for one line,
  // and unix timestamp semantics are not expected to change.
  public static getUnixTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  private static createUUID(): string {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }

    const randomValues = crypto?.getRandomValues?.(new Uint8Array(16));
    if (randomValues) {
      randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
      randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
      const hex = Array.from(randomValues, (value) =>
        value.toString(16).padStart(2, '0'),
      );
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === 'x' ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    });
  }

  // Dynamic import to avoid circular dependency:
  // StorageClass → UIAlert → ... → UISettingsStorage → extends StorageClass
  private async showAlert(message: string, title?: string): Promise<void> {
    const { UIAlert } = await import('../services/uiAlert');
    UIAlert.getInstance()?.showMessage(message, title);
  }

  public async initializeStorage() {
    await this.__initializeStorage();
  }

  public async storageReady(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      if (this.isInitialized === -1) {
        const intV: any = setInterval(async () => {
          if (this.isInitialized === 1) {
            this.uiLog.log(`Storage ${this.DB_PATH} ready`);
            window.clearInterval(intV);
            resolve(undefined);
          } else if (this.isInitialized === 0) {
            window.clearInterval(intV);
            this.uiLog.log(`Storage ${this.DB_PATH} not ready`);
            reject();
          }
        }, 250);
      } else {
        if (this.isInitialized === 1) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already - ready`);
          resolve(undefined);
        } else if (this.isInitialized === 0) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already not - ready`);
          reject();
        }
      }
    });

    return promise;
  }

  public async reinitializeStorage() {
    this.uiLog.log(`Storage - Reinitialize ${this.DB_PATH}`);
    this.isInitialized = -1;
    await this.__initializeStorage();
    this.__sendEvent('REINITIALIZE');
  }

  protected getInitializeValue(): number {
    return this.isInitialized;
  }

  public async add(_entry): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const newEntry = StorageClass.cloneData(_entry);
      try {
        newEntry.config.uuid = StorageClass.createUUID();
        newEntry.config.unix_timestamp = StorageClass.getUnixTimestamp();
        this.storedData.push(newEntry);
        await this.__save();
        this.__sendEvent('ADD');
      } catch (ex) {
        this.uiLog.error('Storage - Add - Unsuccessfully', ex);
        await this.showAlert(ex.message, 'ADD CRITICAL ERROR');
      }
      resolve(StorageClass.cloneData(newEntry));
    });
    return promise;
  }

  public getAllEntries(): Array<any> {
    return this.storedData;
  }

  public async update(_obj): Promise<boolean> {
    const promise: Promise<any> = new Promise(async (resolve, reject) => {
      try {
        let didUpdate: boolean = false;
        for (let i = 0; i < this.storedData.length; i++) {
          if (this.storedData[i].config.uuid === _obj.config.uuid) {
            this.uiLog.log(
              `Storage - Update  - Successfully - ${_obj.config.uuid}`,
            );
            this.storedData[i] = _obj;
            await this.__save();
            this.__sendEvent('UPDATE');
            didUpdate = true;
            resolve(true);
            return;
          }
        }
        if (didUpdate === false) {
          this.uiLog.error(
            `Storage - Update  - Unsucessfully - ${_obj.config.uuid} - not found`,
          );
          this.storedData.push(_obj);
          await this.__save();
          this.__sendEvent('UPDATE');
          resolve(true);
          return;
        }
        resolve(false);
      } catch (ex) {
        this.uiLog.error(
          'Storage - Update  - Unsucessfully - Execption occured',
          ex,
        );
        await this.showAlert(
          `Storage - Update  - Unsucessfully - Execption occured - ${ex.message}`,
          'CRITICAL ERROR',
        );
        resolve(false);
      }
    });
    return promise;
  }

  public async removeByObject(_obj: any): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      if (_obj !== null && _obj !== undefined && _obj.config.uuid) {
        const deleteUUID = _obj.config.uuid;

        const deletedBool: boolean = await this.__delete(deleteUUID);
        resolve(deletedBool);
      } else {
        resolve(false);
      }
    });
    return promise;
  }

  public getByUUID(_uuid: string): any {
    if (_uuid !== null && _uuid !== undefined && _uuid !== '') {
      const findUUID = _uuid;
      for (const data of this.storedData) {
        if (data.config.uuid === findUUID) {
          return data;
        }
      }
    }
  }

  public async removeByUUID(_beanUUID: string): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      if (_beanUUID !== null && _beanUUID !== undefined && _beanUUID !== '') {
        const deletedBool: boolean = await this.__delete(_beanUUID);
        resolve(deletedBool);
      } else {
        resolve(false);
      }
    });
    return promise;
  }

  public attachOnRemove(): Observable<any> {
    return this.removeObjSubject.asObservable();
  }

  public attachOnEvent(): Observable<any> {
    return this.eventSubject.asObservable();
  }

  private __sendRemoveMessage(_id: string) {
    this.removeObjSubject.next({ id: _id });
  }

  private __sendEvent(_type: string) {
    this.eventSubject.next({ type: _type });
  }

  public getDBPath(): string {
    return this.DB_PATH;
  }

  protected async __initializeStorage() {
    this.storedData = [];
    this.isInitialized = -1;
    const promise = new Promise((resolve, reject) => {
      this.uiLog.log(`Initialize Storage - ${this.DB_PATH}`);
      this.uiStorage.get(this.DB_PATH).then(
        (_data) => {
          if (_data === null || _data === undefined) {
            this.uiLog.log(`Storage empty but successfull - ${this.DB_PATH}`);
            // No beans have been added yet
            this.storedData = [];
            this.isInitialized = 1;
          } else {
            this.uiLog.log(`Storage successfull - ${this.DB_PATH}`);
            try {
              this.uiLog.log(
                `Storage successfull - ${this.DB_PATH} - Data amount: ${_data.length}`,
              );
            } catch (ex) {}

            this.storedData = _data;
            this.isInitialized = 1;
          }
          resolve(undefined);
        },
        (e) => {
          // Error
          this.uiLog.log(`Storage error - ${this.DB_PATH}`, e);
          this.storedData = [];
          this.isInitialized = 0;
          reject();
        },
      );
    });
    return promise;
  }

  private __delete(_uuid: string): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      if (_uuid !== null && _uuid !== undefined && _uuid !== '') {
        const deleteUUID = _uuid;
        for (let i = 0; i < this.storedData.length; i++) {
          if (this.storedData[i].config.uuid === deleteUUID) {
            this.uiLog.log(`Storage - Delete - Successfully -${deleteUUID}`);
            this.storedData.splice(i, 1);
            await this.__save();
            this.__sendRemoveMessage(deleteUUID);
            this.__sendEvent('DELETE');
            resolve(true);
            return;
          }
        }
      }
      this.uiLog.error('Storage - Delete - Unsuccessfully');
      resolve(false);
    });
    return promise;
  }

  private async __save() {
    try {
      await this.uiStorage.set(this.DB_PATH, this.storedData).then(
        async (_saved) => {
          if (_saved === true) {
            this.uiLog.log('Storage - Save - Successfully');
          } else {
            this.uiLog.error('Storage - Save Set - Unsuccessfully', _saved);
            await this.showAlert(
              'Storage - Save Set - Unsuccessfully  - ' +
                JSON.stringify(_saved),
              'CRITICAL ERROR',
            );
          }
        },
        async (e) => {
          this.uiLog.error('Storage - Save Set Exception - Unsuccessfully', e);
          await this.showAlert(JSON.stringify(e), 'CRITICAL ERROR - SAVE SET');
        },
      );
    } catch (ex) {
      this.uiLog.error('Storage - Save - Unsuccessfully', ex);
      await this.showAlert(ex.message, 'CRITICAL ERROR');
    }
  }
}
