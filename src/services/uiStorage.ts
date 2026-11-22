import { inject, Service } from '@angular/core';

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
  PENDING_DELETION_STORAGE_KEY,
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

/** Values read from the database, see UIStorage.readValues(). */
export interface StoredValues {
  values: any;
  writeCount: number;
}

@Service()
export class UIStorage {
  private readonly storage = inject(Storage);
  private eventQueue = inject(EventQueueService);
  private readonly uiLog = inject(UILog);

  private _storage: Storage | null = null;

  /**
   * Counted up before and after every write, so values read while it stayed
   * the same are still the stored ones (see readValues).
   */
  private writeCount = 0;

  /**
   * Collections hasCorruptedData() read at start-up, handed to the first
   * read of each (getOrFail) while they were not written since, so the start
   * does not read them twice. Writes to other keys keep them.
   */
  private readAhead: Map<string, unknown> | undefined;

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
    this.__countWrite(_key);
    try {
      await this._storage.set(_key, _val);
    } finally {
      this.__countWrite(_key);
    }
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

  /**
   * Removes a value with a single attempt and without the database dialog;
   * rejects when it could not be removed.
   */
  public async remove(_key: string): Promise<void> {
    this.__countWrite(_key);
    try {
      await this._storage.remove(_key);
    } finally {
      this.__countWrite(_key);
    }
  }

  /**
   * Called before and after every write of `_key`, or of any key when it
   * is left out. Also after the write, as a read that ran meanwhile can
   * have kept the value from before.
   */
  private __countWrite(_key?: string): void {
    this.writeCount++;
    if (_key === undefined) {
      this.readAhead = undefined;
    } else {
      this.readAhead?.delete(_key);
    }
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
    const readAhead = this.__takeReadAhead(_key);
    if (readAhead) {
      return readAhead.value;
    }
    const result = await this.__getWithRetries(_key);
    if (!result.read) {
      throw new Error('UIStorage - Get Key - ' + _key + ' could not be read');
    }
    return result.value;
  }

  private __takeReadAhead(_key: string): { value: unknown } | undefined {
    const readAhead = this.readAhead;
    if (!readAhead?.has(_key)) {
      return undefined;
    }
    const value = readAhead.get(_key);
    readAhead.delete(_key);
    if (readAhead.size === 0) {
      this.readAhead = undefined;
    }
    return { value };
  }

  /**
   * Reads again while it fails, connecting to the database anew after 11
   * attempts. After 20 attempts the database dialog is shown, unless
   * `_showIssue` is false and the caller decides what to show.
   */
  private async __getWithRetries(
    _key: string,
    _showIssue = true,
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
          if (_showIssue) {
            await this.displayIOSIndexedDBIssue();
          }
          return { read: false, value: null };
        }
      }
    }
  }

  public async export(): Promise<any> {
    return (await this.readValues()).values;
  }

  /**
   * The values of export(), and the number of writes before they were read.
   * import() can roll back to them while nothing was written since.
   */
  public async readValues(): Promise<StoredValues> {
    const writeCount = this.writeCount;
    const values = {};

    await this._storage.forEach((_value, _key, _index) => {
      values[_key] = _value;
    });

    // Contains credentials; files written for the user are stripped in
    // UIExportImportHelper.buildExportZIP (see settingsSecrets.ts).
    return { values, writeCount };
  }

  public async clearStorage() {
    this.__countWrite();
    try {
      await this._storage.clear();
    } finally {
      this.__countWrite();
    }
  }

  /**
   * Whether the database holds data of a used installation: a VERSION entry
   * with at least one finished data update.
   *
   * Read with the attempts of get(). A database that still could not be
   * read is 'unknown' and never taken for an empty one: the entries can
   * still be stored. Every caller has to decide what it leaves alone and
   * what it shows then.
   */
  public async getDataState(): Promise<'data' | 'empty' | 'unknown'> {
    const version = await this.__getWithRetries('VERSION', false);
    if (!version.read) {
      this.uiLog.error('UIStorage - Data state - could not be read');
      return 'unknown';
    }
    return version.value?.[0]?.updatedDataVersions?.length > 0
      ? 'data'
      : 'empty';
  }

  /**
   * Counts the brews, mills, preparations and beans, and whether brews are
   * stored without the others. `_stored` are the values of export() when
   * the caller already read them; otherwise the database is read, and with
   * `_keepForFirstRead` the collections counted are kept for their first
   * read (see readAhead).
   */
  public async hasCorruptedData(
    _stored?: Record<string, unknown>,
    _keepForFirstRead = false,
  ): Promise<{
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
    const writeCount = this.writeCount;
    const counted = new Map<string, unknown>();
    const count = (_value: any, _key: string) => {
      if (
        _key === 'BREWS' ||
        _key === 'MILL' ||
        _key === 'PREPARATION' ||
        _key === 'BEANS'
      ) {
        counted.set(_key, _value);
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
    };
    try {
      if (_stored) {
        for (const [key, value] of Object.entries(_stored)) {
          count(value, key);
        }
      } else {
        await this._storage.forEach(count);
        // A value written while it was read can be the one from before.
        if (_keepForFirstRead && writeCount === this.writeCount) {
          this.readAhead = counted;
        }
      }
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
   *
   * `_currentDataUnreadable`: the user chose the backup because the
   * database could not be read at start-up. If the current data still
   * cannot be read, it is imported without a copy, and an import that fails
   * is reported as one that could not be rolled back.
   *
   * Resolves `{ BACKUP: false }` once the import is stored, and
   * `{ BACKUP: true }` when it failed and was rolled back: the stored keys
   * and values are those from before again. Rejects with `{ BACKUP: true }`
   * when the rollback failed as well; the stored data can then be a mix.
   * Both carry the error of the import as `cause`.
   *
   * `_current` are values the caller read before (readValues()). They are
   * kept as the copy to roll back to while nothing was written since;
   * otherwise the current data is read again.
   */
  public async import(
    _data: any,
    _source: RESTORE_SOURCE = 'import',
    _fileName?: string,
    _currentDataUnreadable = false,
    _current?: StoredValues,
  ): Promise<any> {
    try {
      // A deletion that was interrupted is never finished on other data
      // than it was started on, also when this import fails.
      await this._storage.remove(PENDING_DELETION_STORAGE_KEY);
    } catch (ex) {
      this.uiLog.error('UIStorage - Import - Pending deletion not removed', ex);
    }
    // Before we import, we do a saftey backup
    const _backup =
      _current?.writeCount === this.writeCount
        ? _current.values
        : await this.__safteyBackup().catch((ex: unknown) => {
            if (!_currentDataUnreadable) {
              throw ex;
            }
            this.uiLog.error(
              'UIStorage - Import - the current data could not be read, imported without a copy to roll back to',
              ex,
            );
            return undefined;
          });
    this.__countWrite();
    const previousNote: unknown = _backup?.[LAST_RESTORE_STORAGE_KEY];
    let importData: any;
    try {
      importData = this.__withImportedUserProfile(
        this.__keepDeviceSecrets(_data, _backup),
      );
      await this.removeDuplicateEntries(importData);
      this.__fillMissingChangeInfo(importData);
      if (previousNote !== undefined) {
        // The note is about the data stored so far. It must not be taken
        // for one about the data of this import, when its own note cannot
        // be stored or the app is closed before.
        await this._storage.remove(LAST_RESTORE_STORAGE_KEY);
      }
      await this.__importBackup(importData);
      // Collections the backup does not contain stay as they are stored.
      await this.__noteRestore(
        { ..._backup, ...importData },
        _source,
        _fileName,
      );

      return { BACKUP: false };
    } catch (ex) {
      try {
        if (_backup === undefined) {
          throw new Error('UIStorage - Import - nothing to roll back to');
        }
        await this.__importBackup(_backup);
        await this.__removeImportedKeys(importData, _backup);
      } catch {
        throw { BACKUP: true, cause: ex };
      }
      await this.__keepRestoreNote(previousNote);
      return { BACKUP: true, cause: ex };
    } finally {
      this.__countWrite();
    }
  }

  /**
   * Stores the note about the import before again, once an import was
   * rolled back. Never throws: without the note the data only counts as
   * changed since the last import.
   */
  private async __keepRestoreNote(_note: unknown): Promise<void> {
    if (_note === undefined) {
      return;
    }
    try {
      await this._storage.set(LAST_RESTORE_STORAGE_KEY, _note);
    } catch (ex) {
      this.uiLog.error('UIStorage - Import - Restore note not kept', ex);
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
  public async removeDuplicateEntries(_data: any): Promise<void> {
    if (typeof _data !== 'object' || _data === null) {
      return;
    }
    try {
      const results = await removeDuplicateEntriesFromData(_data);
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
   * how many entries `_data`, the values stored now, holds (IRestoreNote),
   * and the name of the file when it is known. One note is enough, no entry is marked: the imported entries keep
   * the change info they came with, so they never look like changes made on
   * this device, and a mark on every entry would stay until the entry is
   * edited again and cost a write of whole collections. The previous note
   * is removed before the data is replaced, and stored again when the import
   * was rolled back.
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

  /**
   * Removes the keys only the backup file brought along, once the values
   * from before were written back, so a rolled back import leaves exactly
   * the keys stored before. Rejects when one cannot be removed.
   */
  private async __removeImportedKeys(
    _importData: any,
    _backup: any,
  ): Promise<void> {
    for (const key of Object.keys(_importData ?? {})) {
      if (
        !isLocalOnlyStorageKey(key) &&
        !Object.prototype.hasOwnProperty.call(_backup, key)
      ) {
        await this._storage.remove(key);
      }
    }
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
