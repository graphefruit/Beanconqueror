/** Core */
import {Injectable} from '@angular/core';
/** Ionic native */
/** Classes */
import {Settings} from '../classes/settings/settings';
/** Interfaces */
import {ISettings} from '../interfaces/settings/iSettings';
/** Services */
import {StorageClass} from '../classes/storageClass';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';


@Injectable({
  providedIn: 'root'
})
export class UISettingsStorage extends StorageClass {
  private settings: Settings = new Settings();
  private isSettingsInitialized: number = -1;
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, 'SETTINGS');

    super.storageReady()
      .then(() => {

      const entries: Array<any> = this.getAllEntries();
      if (entries.length > 0) {
        // We already had some settings here.
        if (this.settings === undefined) {
          this.settings = new Settings();
        }
        this.settings.initializeByObject(entries[0]);
        this.isSettingsInitialized = 1;
      } else {
        // Take the new settings obj.
        super.add(this.settings);
        this.isSettingsInitialized = 1;
      }
    }, () => {
      // Outsch, cant do much.
        this.isSettingsInitialized = 0;
    });
  }

  public async storageReady(): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      if (this.isSettingsInitialized === -1) {
        const intV: any = setInterval(async () => {
          if (this.isSettingsInitialized === 1) {
            this.uiLog.log(`Storage ${this.DB_PATH} ready`);
            window.clearInterval(intV);
            resolve();
          } else if (this.isSettingsInitialized === 0) {
            window.clearInterval(intV);
            this.uiLog.log(`Storage ${this.DB_PATH} not ready`);
            reject();
          }
        }, 250);
      } else {
        if (this.isSettingsInitialized === 1) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already - ready`);
          resolve();
        } else if (this.isSettingsInitialized === 0) {
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
        this.settings.initializeByObject(entries[0]);
      } else {
        // Take the new settings obj.
        super.add(this.settings);
      }
    }, () => {
      // Outsch, cant do much.
    });
  }
  public getSettings(): Settings {
    return this.settings;
  }

  public saveSettings(settings: ISettings | Settings): void {
      super.update(settings);
  }

}
