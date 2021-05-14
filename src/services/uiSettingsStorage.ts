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
  /**
   * Singelton instance
   */
  public static instance: UISettingsStorage;
  private settings: Settings = new Settings();
  private isSettingsInitialized: number = -1;

  public static getInstance(): UISettingsStorage {
    if (UISettingsStorage.instance) {
      return UISettingsStorage.instance;
    }

    return undefined;
  }

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, 'SETTINGS');
    if (UISettingsStorage.instance === undefined) {
      UISettingsStorage.instance = this;
    }
    super.storageReady()
      .then(async () => {

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
        await super.add(this.settings);
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

  public async reinitializeStorage() {
    await super.reinitializeStorage();

    await super.storageReady().then(async () => {
      const entries: Array<any> = this.getAllEntries();
      if (entries.length > 0) {
        // We already had some settings here.

        // Issue found - when we add new data types or over import, we need to clean up settings before and then initialize by object
        this.settings = new Settings();
        this.settings.initializeByObject(entries[0]);
      } else {
        // Take the new settings obj.
        await super.add(this.settings);
      }
    }, () => {
      // Outsch, cant do much.
    });
  }
  public getSettings(): Settings {
    return this.settings;
  }

  public async saveSettings(settings: ISettings | Settings) {
      await super.update(settings);
  }

}
