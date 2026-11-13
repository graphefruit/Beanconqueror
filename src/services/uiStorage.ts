import { inject, Injectable } from '@angular/core';

import { Storage } from '@ionic/storage';

import { AppEvent } from '../classes/appEvent/appEvent';
import {
  CHANGE_TRACKED_COLLECTIONS,
  FillChangeInfoStats,
  fillMissingChangeInfo,
} from '../classes/changeTracking/changeTracking';
import {
  countWithoutIdenticalCopies,
  removeDuplicateEntriesFromData,
} from '../classes/changeTracking/duplicateEntries';
import {
  isLocalOnlyStorageKey,
  LAST_RESTORE_STORAGE_KEY,
} from '../classes/changeTracking/localStorageKeys';
import { withImportedUserProfile } from '../classes/settings/importedUserProfile';
import { withDeviceSettingsSecrets } from '../classes/settings/settingsSecrets';
import { AppEventType } from '../enums/appEvent/appEvent';
import {
  IRestoreNote,
  RESTORE_SOURCE,
} from '../interfaces/changeTracking/iRestoreNote';
import { EventQueueService } from './queueService/queue-service.service';
import { UILog } from './uiLog';

@Injectable({
  providedIn: 'root',
})
export class UIStorage {
  private readonly storage = inject(Storage);
  private eventQueue = inject(EventQueueService);
  private readonly uiLog = inject(UILog);

  private _storage: Storage | null = null;

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
      this.uiLog.error('UIStorage - ReinitializeStorage - Issue occured', ex);
    }
  }

  public async set(_key: string, _val: any): Promise<boolean> {
    let whileCounter = 0;
    while (true) {
      try {
        this.uiLog.log(
          'UIStorage - Set Key - ' + _key + ' start counter:' + whileCounter,
        );
        await this.internalSet(_key, _val);
        this.uiLog.log('UIStorage - Set Key - ' + _key + ' successfully');
        return true;
      } catch (ex) {
        // We could not access the database... do it again.
        this.uiLog.error(
          'UIStorage - Set Key - ' + _key + ' exception ' + JSON.stringify(ex),
        );
        await new Promise((_internalResolve) => {
          setTimeout(() => {
            _internalResolve(undefined);
          }, 100);
        });
        whileCounter++;
        if (whileCounter === 11) {
          this.uiLog.error(
            'UIStorage - Set Key - ' +
              _key +
              ' we try to reconnect to the database and hopefully fix all issues',
          );
          await this.reinitializeStorage();
        } else if (whileCounter >= 20) {
          this.uiLog.error(
            'UIStorage - Set Key - ' +
              _key +
              ' we stop to try getting data now 20 attempts are enough - show error',
          );
          await this.displayIOSIndexedDBIssue();
          throw ex;
        }
      }
    }
  }

  private async displayIOSIndexedDBIssue() {
    const { UIAlert } = await import('./uiAlert');
    await UIAlert.getInstance()?.showIOSIndexedDBIssues(
      'IOS_DATABASE_ISSUE_DESCRIPTION',
      'IOS_DATABASE_ISSUE_TITLE',
      true,
    );
  }
  private async internalSet(_key: string, _val: any): Promise<boolean> {
    await this._storage.set(_key, _val);
    // Backups never contain local-only keys, so writing them needs no new one.
    if (isLocalOnlyStorageKey(_key)) {
      return true;
    }
    // We just trigger storage change when the set was successfully.
    this.eventQueue.dispatch(
      new AppEvent(AppEventType.STORAGE_CHANGED, undefined),
    );
    return true;
  }

  private async internalGet(_key: string): Promise<any> {
    // We didn't wait here, maybe this will fix some issues :O?
    const data = await this._storage.get(_key);
    return data;
  }

  public async get(_key: string): Promise<any> {
    const result = await this.__getWithRetries(_key);
    return result.read ? result.value : null;
  }

  /**
   * Like get(), but rejects when the database could not be read, instead of
   * resolving with null. Lets callers tell a missing value from a read error,
   * so they never replace a stored value they could not read.
   */
  public async getOrFail(_key: string): Promise<any> {
    const result = await this.__getWithRetries(_key);
    if (!result.read) {
      throw new Error('UIStorage - Get Key - ' + _key + ' could not be read');
    }
    return result.value;
  }

  private async __getWithRetries(
    _key: string,
  ): Promise<{ read: boolean; value: any }> {
    let whileCounter = 0;
    while (true) {
      try {
        this.uiLog.log(
          'UIStorage - Get Key - ' + _key + ' start counter:' + whileCounter,
        );
        const data = await this.internalGet(_key);
        this.uiLog.log('UIStorage - Get Key - ' + _key + ' successfully');
        return { read: true, value: data };
      } catch (ex) {
        // We could not access the database... do it again.
        this.uiLog.error(
          'UIStorage - Get Key - ' + _key + ' exception ' + JSON.stringify(ex),
        );
        await new Promise((_internalResolve) => {
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
              ' we try to reconnect to the database and hopefully fix all issues',
          );
        } else if (whileCounter >= 20) {
          this.uiLog.error(
            'UIStorage - Get Key - ' +
              _key +
              ' we stop to try getting data now 20 attempts are enough - show error',
          );
          await this.displayIOSIndexedDBIssue();
          return { read: false, value: null };
        }
      }
    }
  }

  public async export(): Promise<any> {
    const exportObj = {};

    await this._storage.forEach((_value, _key, _index) => {
      exportObj[_key] = _value;
    });

    // Contains credentials; files written for the user are stripped in
    // UIExportImportHelper.buildExportZIP (see settingsSecrets.ts).
    return exportObj;
  }

  public async clearStorage() {
    await this._storage.clear();
  }

  public async hasData(): Promise<boolean> {
    let hasData: boolean = false;

    try {
      await this._storage.forEach((_value, _key, _index) => {
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
      });
      return hasData;
    } catch (ex) {
      return false;
    }
  }

  public async hasCorruptedData(): Promise<{
    CORRUPTED: boolean;
    DATA: {
      BREWS: number;
      MILL: number;
      PREPARATION: number;
      BEANS: number;
    };
  }> {
    const hasDataObj = {
      BREWS: 0,
      MILL: 0,
      PREPARATION: 0,
      BEANS: 0,
    };
    try {
      await this._storage.forEach((_value, _key, _index) => {
        if (
          _key === 'BREWS' ||
          _key === 'MILL' ||
          _key === 'PREPARATION' ||
          _key === 'BEANS'
        ) {
          try {
            if (_value?.length > 0) {
              hasDataObj[_key] = _value?.length;
              // Counted as an import stores them, like the backup these
              // numbers are compared with: copies of an entry that are
              // identical in a backup file do not count, also before data
              // update UPDATE_17 removed them.
              if (Array.isArray(_value)) {
                hasDataObj[_key] = countWithoutIdenticalCopies(_value);
              }
            } else {
              hasDataObj[_key] = 0;
            }
          } catch (ex) {}
        }
      });
      if (
        hasDataObj.BREWS > 0 &&
        (hasDataObj.MILL <= 0 ||
          hasDataObj.PREPARATION <= 0 ||
          hasDataObj.BEANS <= 0)
      ) {
        /**
         * If we got brews but not a mill / preparation / or bean something broke hard.
         * We saw this issue on android that a user got brews but no beans anymore, they where lost
         */
        return { CORRUPTED: true, DATA: hasDataObj };
      } else {
        return { CORRUPTED: false, DATA: hasDataObj };
      }
    } catch (ex) {
      return { CORRUPTED: false, DATA: hasDataObj };
    }
  }

  /**
   * Replaces the stored values with those of a parsed backup. Backups are
   * imported through UIExportImportHelper.importBackup(), which first writes
   * the current data into a backup file. The copy kept here for the rollback
   * only lives in memory. `_fileName` is the name of the backup file, when
   * it is known; it goes into the note about the import.
   */
  public async import(
    _data: any,
    _source: RESTORE_SOURCE = 'import',
    _fileName?: string,
  ): Promise<any> {
    // Before we import, we do a saftey backup
    const _backup = await this.__safteyBackup();
    try {
      const importData = this.__withImportedUserProfile(
        this.__keepDeviceSecrets(_data, _backup),
      );
      this.removeDuplicateEntries(importData);
      this.__fillMissingChangeInfo(importData);
      await this.__importBackup(importData);
      await this.__noteRestore(importData, _source, _fileName);

      return { BACKUP: false };
    } catch (ex) {
      try {
        await this.__importBackup(_backup);
        return { BACKUP: true };
      } catch (ex) {
        throw { BACKUP: true };
      }
    }
  }

  /**
   * Backups made by older app versions can contain entries that share a
   * uuid. Data update UPDATE_17 cleans them up on this device, and the same
   * cleanup runs on every backup before it is imported, so an import does
   * not bring them back (see classes/changeTracking/duplicateEntries.ts).
   * The parsed backup is changed in place. The check of the internal backup
   * at start-up uses it as well, to count the entries an import would store.
   *
   * Never throws; a failed cleanup does not stop the import. Each
   * collection is either cleaned completely or left as it is.
   */
  public removeDuplicateEntries(_data: any): void {
    if (typeof _data !== 'object' || _data === null) {
      return;
    }
    try {
      const results = removeDuplicateEntriesFromData(_data, () =>
        crypto.randomUUID(),
      );
      for (const [collection, result] of Object.entries(results)) {
        const prefix = `UIStorage - Backup - Duplicate entries in ${collection}`;
        this.uiLog.log(
          `${prefix} - shared uuids: ${result.groups}, identical copies removed: ${result.removed}, new uuids: ${result.renamed.length}, kept: ${result.kept.length}`,
        );
        for (const uuid of result.kept) {
          this.uiLog.log(
            `${prefix} - ${uuid} - differing copies kept, the uuid is referenced`,
          );
        }
        for (const renamed of result.renamed) {
          this.uiLog.log(
            `${prefix} - ${renamed.uuid} - differing copy got the uuid ${renamed.new_uuid}`,
          );
        }
      }
    } catch (ex) {
      this.uiLog.error(
        'UIStorage - Backup - Duplicate entries not cleaned',
        ex,
      );
    }
  }

  /**
   * Backups do not contain credentials, so importing one must not wipe the
   * credentials already stored on this device.
   */
  private __keepDeviceSecrets(_data: any, _deviceData: any): any {
    const importedSettings = _data?.SETTINGS;
    const deviceSettings = _deviceData?.SETTINGS?.[0];
    if (!Array.isArray(importedSettings) || !deviceSettings) {
      return _data;
    }
    return {
      ..._data,
      SETTINGS: importedSettings.map((_settings: unknown) =>
        withDeviceSettingsSecrets(_settings, deviceSettings),
      ),
    };
  }

  /**
   * A backup brings the experience mode of its data along; one without it
   * gets the advanced mode and the note about it is still to be shown (see
   * withImportedUserProfile). A backup without settings leaves that to the
   * settings created after the import (UISettingsStorage).
   */
  private __withImportedUserProfile(_data: any): any {
    const importedSettings = _data?.SETTINGS;
    if (!Array.isArray(importedSettings)) {
      return _data;
    }
    return {
      ..._data,
      SETTINGS: importedSettings.map((_settings: unknown) =>
        withImportedUserProfile(_settings),
      ),
    };
  }

  /**
   * A backup can come from an older app version. Its VERSION entry can
   * already contain the data update that fills in the change info, while
   * single entries (for example added in that older version) still lack it,
   * so it is filled in here. Values the backup brings along are kept, they
   * are not replaced by the time of the import. The parsed backup is only
   * used for this import, so it is changed in place.
   */
  private __fillMissingChangeInfo(_data: any): void {
    if (typeof _data !== 'object' || _data === null) {
      return;
    }
    const stats: FillChangeInfoStats = { skipped: 0 };
    let filled = 0;
    for (const collection of CHANGE_TRACKED_COLLECTIONS) {
      if (Array.isArray(_data[collection])) {
        filled += fillMissingChangeInfo(_data[collection], stats);
      }
    }
    this.uiLog.log(
      `UIStorage - Import - Change info filled in for ${filled} entries, ${stats.skipped} entries without config skipped`,
    );
  }

  /**
   * Notes the completed import under a local-only key: when, from where and
   * how many entries (IRestoreNote), and the name of the file when it is
   * known. One note is enough, no entry is marked: the imported entries keep
   * the change info they came with, so they never look like changes made on
   * this device, and a mark on every entry would stay until the entry is
   * edited again and cost a write of whole collections. An import that was
   * rolled back leaves the previous note.
   *
   * Never throws: the data is already stored and must not be rolled back
   * because of the note.
   */
  private async __noteRestore(
    _data: any,
    _source: RESTORE_SOURCE,
    _fileName?: string,
  ): Promise<void> {
    try {
      let recordCount = 0;
      for (const collection of CHANGE_TRACKED_COLLECTIONS) {
        if (Array.isArray(_data?.[collection])) {
          recordCount += _data[collection].length;
        }
      }
      const note: IRestoreNote = {
        last_restore_at: Date.now(),
        source: _source,
        record_count: recordCount,
      };
      if (_fileName !== undefined) {
        note.file_name = _fileName;
      }
      await this._storage.set(LAST_RESTORE_STORAGE_KEY, note);
    } catch (ex) {
      this.uiLog.error('UIStorage - Import - Restore note not stored', ex);
    }
  }

  private async __safteyBackup(): Promise<any> {
    return await this.export();
  }

  private async __importBackup(_data: any): Promise<void> {
    // Values that belong to this installation are never replaced by a file,
    // also not when the safety backup is written back.
    const keys = Object.keys(_data).filter(
      (_key) => !isLocalOnlyStorageKey(_key),
    );
    for (const key of keys) {
      await this._storage.set(key, _data[key]);
    }
  }
}
