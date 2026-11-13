import { Injectable } from '@angular/core';

import { Settings } from '../classes/settings/settings';
import { StorageClass } from '../classes/storageClass';
import { EXPERIENCE_MODE_ENUM } from '../enums/settings/experienceMode';
import { ISettings } from '../interfaces/settings/iSettings';

@Injectable({
  providedIn: 'root',
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

  constructor() {
    super('SETTINGS');

    if (UISettingsStorage.instance === undefined) {
      UISettingsStorage.instance = this;
    }
    super.storageReady().then(
      async () => {
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
          this.settings.user.experience_mode =
            await this.experienceModeForNewSettings();
          const data: any = await super.add(this.settings);
          this.settings = new Settings();
          this.settings.initializeByObject(data);
          this.isSettingsInitialized = 1;
        }
      },
      () => {
        // Outsch, cant do much.
        this.isSettingsInitialized = 0;
      },
    );
  }

  public async initializeStorage() {
    await super.__initializeStorage();
  }

  public async storageReady(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      if (this.isSettingsInitialized === -1) {
        const intV: any = setInterval(() => {
          if (this.isSettingsInitialized === 1) {
            this.uiLog.log(`Storage ${this.DB_PATH} ready`);
            window.clearInterval(intV);
            resolve(undefined);
          } else if (this.isSettingsInitialized === 0) {
            window.clearInterval(intV);
            this.uiLog.log(`Storage ${this.DB_PATH} not ready`);
            reject();
          }
        }, 250);
      } else {
        if (this.isSettingsInitialized === 1) {
          this.uiLog.log(`Storage ${this.DB_PATH} - already - ready`);
          resolve(undefined);
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

    await super.storageReady().then(
      async () => {
        const entries: Array<any> = this.getAllEntries();
        if (entries.length > 0) {
          // We already had some settings here.

          // Issue found - when we add new data types or over import, we need to clean up settings before and then initialize by object
          this.settings = new Settings();
          this.settings.initializeByObject(entries[0]);
        } else {
          this.settings.user.experience_mode =
            await this.experienceModeForNewSettings();
          const data: any = await super.add(this.settings);
          this.settings = new Settings();
          this.settings.initializeByObject(data);
        }
      },
      () => {
        // Outsch, cant do much.
      },
    );
  }
  /**
   * Settings are created when none are stored. On a new installation that
   * starts the beginner mode. If brews, beans or finished data updates are
   * already stored, the app has been used before and only the settings went
   * missing, so the advanced mode is kept. When that cannot be read, the
   * advanced mode is used as well, so an existing user is never downgraded.
   */
  private async experienceModeForNewSettings(): Promise<EXPERIENCE_MODE_ENUM> {
    try {
      const version: unknown = await this.uiStorage.getOrFail('VERSION');
      if (
        Array.isArray(version) &&
        version.some(
          (_entry) =>
            Array.isArray(_entry?.updatedDataVersions) &&
            _entry.updatedDataVersions.length > 0,
        )
      ) {
        return EXPERIENCE_MODE_ENUM.ADVANCED;
      }
      for (const key of ['BREWS', 'BEANS']) {
        const stored: unknown = await this.uiStorage.getOrFail(key);
        if (Array.isArray(stored) && stored.length > 0) {
          return EXPERIENCE_MODE_ENUM.ADVANCED;
        }
      }
      return EXPERIENCE_MODE_ENUM.BEGINNER;
    } catch (ex) {
      this.uiLog.log(
        'Settings - Could not check for existing data, keep advanced mode',
        ex,
      );
      return EXPERIENCE_MODE_ENUM.ADVANCED;
    }
  }

  public getSettings(): Settings {
    return this.settings;
  }

  public async saveSettings(settings: ISettings | Settings): Promise<boolean> {
    return await super.update(settings);
  }
}
