import {UIHelper} from '../services/uiHelper';
import {UILog} from '../services/uiLog';
import {UIStorage} from '../services/uiStorage';

export abstract class StorageClass {

  public DB_PATH: string = '';
  protected storedData: Array<any> = [];

  /**
   * -1 = Nothing started
   * 0 = Error occured
   * 1 = Initialized
   */
  private isInitialized: number = -1;

  protected constructor (protected uiStorage: UIStorage,
                         protected uiHelper: UIHelper,
                         protected uiLog: UILog, protected dbPath: string) {

      this.DB_PATH = dbPath;
      this.__initializeStorage();

  }

  public async storageReady (): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      if (this.isInitialized === -1) {
        const intV: any = setInterval(() => {
          if (this.isInitialized === 1) {
            this.uiLog.log(`Storage ${this.DB_PATH} initialized`);
            window.clearInterval(intV);
            resolve();
          } else if (this.isInitialized === 0) {
            window.clearInterval(intV);
            this.uiLog.log(`Storage ${this.DB_PATH} not initialized`);
            reject();
          }
        }, 250);
      } else {
        if (this.isInitialized === 1) {
          this.uiLog.log(`Storage ${this.DB_PATH} initialized`);

          resolve();
        } else if (this.isInitialized === 0) {
          this.uiLog.log(`Storage ${this.DB_PATH} not initialized`);
          reject();
        }
      }

    });

    return promise;
  }

  public reinitializeStorage (): void {
    this.isInitialized = -1;
    this.__initializeStorage();
  }

  public add (_entry): void {
    _entry.config.uuid = this.uiHelper.generateUUID();
    _entry.config.unix_timestamp = this.uiHelper.getUnixTimestamp();
    this.storedData.push(_entry);
    this.__save();
  }

  public getAllEntries (): Array<any> {
    return this.storedData;
  }

  public update (_obj): boolean {
    for (let i = 0; i < this.storedData.length; i++) {
      if (this.storedData[i].config.uuid === _obj.config.uuid) {
        this.uiLog.log(`Storage - Update  - Successfully - ${ _obj.config.uuid}`);
        this.storedData[i] = _obj;
        this.__save();

        return true;
      }
    }

    return false;
  }

  public removeByObject(_obj: any): boolean {
    if (_obj !== null && _obj !== undefined && _obj.config.uuid) {
      const deleteUUID = _obj.config.uuid;

      return this.__delete(deleteUUID);
    }

    return false;
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

  public removeByUUID(_beanUUID: string): boolean {
    if (_beanUUID !== null && _beanUUID !== undefined && _beanUUID !== '') {
      return this.__delete(_beanUUID);
    }

    return false;
  }

  public getDBPath (): string {

    return this.DB_PATH;
  }

  protected __initializeStorage (): void {
    this.uiLog.log(`Initialize Storage - ${this.DB_PATH}`);
    this.uiStorage.get(this.DB_PATH).then((_data) => {
      if (_data === null || _data === undefined) {
        this.uiLog.log(`Storage empty but successfull - ${this.DB_PATH}`);
        // No beans have been added yet
        this.storedData = [];
        this.isInitialized = 1;
      } else {
        this.uiLog.log(`Storage successfull - ${this.DB_PATH}`);
        this.storedData = _data;
        this.isInitialized = 1;
      }
    }, (e) => {
      // Error
      this.uiLog.log(`Storage error - ${this.DB_PATH} - ${JSON.stringify(e)}`);
      this.storedData = [];
      this.isInitialized = 1;
    });
  }

  private __delete(_uuid: string): boolean {
    if (_uuid !== null && _uuid !== undefined && _uuid !== '') {
      const deleteUUID = _uuid;
      for (let i = 0; i < this.storedData.length; i++) {
        if (this.storedData[i].config.uuid === deleteUUID) {
          this.uiLog.log(`Storage - Delete - Successfully -${deleteUUID}`);
          this.storedData.splice(i, 1);
          this.__save();

          return true;
        }
      }
    }
    this.uiLog.error('Storage - Delete - Unsuccessfully');

    return false;

  }

  private __save (): void {
    this.uiStorage.set(this.DB_PATH, this.storedData).then((e) => {
        this.uiLog.log('Storage - Save - Successfully');
      }, (e) => {
        this.uiLog.log('Storage - Save - Unsuccessfully');
      }
    );
  }

}
