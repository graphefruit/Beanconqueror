import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';
import { Observable, Subject } from 'rxjs';

export abstract class StorageClass {
  private removeObjSubject = new Subject<any>();
  private eventSubject = new Subject<any>();
  public DB_PATH: string = '';
  protected storedData: Array<any> = [];

  /**
   * -1 = Nothing started
   * 0 = Error occured
   * 1 = Initialized
   */
  private isInitialized: number = -1;

  protected constructor(
    protected uiStorage: UIStorage,
    protected uiHelper: UIHelper,
    protected uiLog: UILog,
    protected dbPath: string
  ) {
    this.DB_PATH = dbPath;
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
      const newEntry = this.uiHelper.cloneData(_entry);
      try {
        newEntry.config.uuid = this.uiHelper.generateUUID();
        newEntry.config.unix_timestamp = this.uiHelper.getUnixTimestamp();
        this.storedData.push(newEntry);
        await this.__save();
        this.__sendEvent('ADD');
      } catch (ex) {
        this.uiLog.error(
          `Storage - Add - Unsuccessfully - ${JSON.stringify(ex)}`
        );
        this.uiHelper.showAlert(ex.message, 'ADD CRITICAL ERROR');
      }
      resolve(this.uiHelper.cloneData(newEntry));
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
              `Storage - Update  - Successfully - ${_obj.config.uuid}`
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
            `Storage - Update  - Unsucessfully - ${_obj.config.uuid} - not found`
          );
        }
        resolve(false);
      } catch (ex) {
        this.uiLog.error(
          `Storage - Update  - Unsucessfully - Execption occured- ${ex.message}`
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
                `Storage successfull - ${this.DB_PATH} - Data amount: ${_data.length}`
              );
            } catch (ex) {}

            this.storedData = _data;
            this.isInitialized = 1;
          }
          resolve(undefined);
        },
        (e) => {
          // Error
          this.uiLog.log(
            `Storage error - ${this.DB_PATH} - ${JSON.stringify(e)}`
          );
          this.storedData = [];
          this.isInitialized = 0;
          reject();
        }
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
    await this.uiStorage.set(this.DB_PATH, this.storedData).then(
      (e) => {
        this.uiLog.log('Storage - Save - Successfully');
      },
      (e) => {
        this.uiLog.error(
          `Storage - Save - Unsuccessfully - ${JSON.stringify(e)}`
        );
        this.uiHelper.showAlert(e.message, 'CRITICAL ERROR');
      }
    );
  }
}
