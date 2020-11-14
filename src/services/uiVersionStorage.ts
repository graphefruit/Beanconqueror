/** Core */
import {Injectable} from '@angular/core';
/** Services */
import {StorageClass} from '../classes/storageClass';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';
import {Version} from '../classes/version/iVersion';
import {IVersion} from '../interfaces/version/iVersion';

/** Ionic native */


@Injectable({
  providedIn: 'root'
})
export class UiVersionStorage extends StorageClass {
  private version: Version = new Version();
  private isVersionInitialized: number = -1;
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, 'VERSION');

    super.storageReady()
      .then(() => {

      const entries: Array<any> = this.getAllEntries();
      if (entries.length > 0) {
        // We already had some settings here.
        if (this.version === undefined) {
          this.version = new Version();
        }
        this.version.initializeByObject(entries[0]);
        this.isVersionInitialized = 1;
      } else {
        // Take the new settings obj.
        super.add(this.version);
        this.isVersionInitialized = 1;
      }
    }, () => {
      // Outsch, cant do much.
        this.isVersionInitialized = 0;
    });
  }

  public async storageReady(): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      if (this.isVersionInitialized === -1) {
        const intV: any = setInterval(async () => {
          if (this.isVersionInitialized === 1) {
            this.uiLog.log(`Storage ${this.DB_PATH} ready`);
            window.clearInterval(intV);
            resolve();
          } else if (this.isVersionInitialized === 0) {
            window.clearInterval(intV);
            this.uiLog.log(`Storage ${this.DB_PATH} not ready`);
            reject();
          }
        }, 250);
      } else {
        if (this.isVersionInitialized === 1) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already - ready`);
          resolve();
        } else if (this.isVersionInitialized === 0) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already - not - ready`);
          reject();
        }
      }

    });

    return promise;
  }

  public reinitializeStorage(): void {
    super.reinitializeStorage();

    super.storageReady().then(() => {
      const entries: Array<any> = this.getAllEntries();
      if (entries.length > 0) {
        // We already had some settings here.
        this.version.initializeByObject(entries[0]);
      } else {
        // Take the new settings obj.
        super.add(this.version);
      }
    }, () => {
      // Outsch, cant do much.
    });
  }
  public getVersion(): Version {
    return this.version;
  }

  public saveVersion(version: IVersion): void {
      super.update(version);
  }

}
