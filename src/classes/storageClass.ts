import { inject } from '@angular/core';

import { cloneDeep } from 'lodash';
import { Observable, Subject } from 'rxjs';

import { DeletionJournalService } from '../services/deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../services/deviceIdentity/device-identity.service';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';
import {
  copyChangeInfo,
  isChangeTrackedCollection,
  stampAdded,
  stampUpdated,
} from './changeTracking/changeTracking';

export interface StorageClassAddResult {
  entry: any;
  saved: boolean;
}

export interface StorageWriteOptions {
  /**
   * Defaults to true. False is the system write path for migrations,
   * backfills and similar maintenance: the change info (updated_at, rev,
   * updated_by) of the entry is kept as it is.
   */
  touch?: boolean;
}

export abstract class StorageClass {
  protected uiStorage = inject(UIStorage);
  protected uiLog = inject(UILog);
  protected deviceIdentity = inject(DeviceIdentityService);
  protected deletionJournal = inject(DeletionJournalService);

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

  protected prepareEntryForStorage(_entry: any): any {
    return _entry;
  }

  private tracksChanges(): boolean {
    return isChangeTrackedCollection(this.DB_PATH);
  }

  // Dynamic import to avoid circular dependency:
  // StorageClass → UIAlert → ... → UISettingsStorage → extends StorageClass
  private async showAlert(
    message: string,
    title: string | undefined,
    onRejected: (reason: unknown) => void,
  ): Promise<void> {
    const { UIAlert } = await import('../services/uiAlert');
    const alertPromise = UIAlert.getInstance()?.showMessage(message, title);
    void alertPromise?.catch(onRejected);
  }

  private async showAlertSafely(
    message: string,
    title?: string,
  ): Promise<void> {
    const logAlertError = (ex: unknown) => {
      this.uiLog.error('Storage - Alert - Unsuccessfully', ex);
    };
    try {
      await this.showAlert(message, title, logAlertError);
    } catch (ex) {
      logAlertError(ex);
    }
  }

  private createFailedAddEntry(_entry: any): any {
    const failedEntry =
      _entry !== null && typeof _entry === 'object'
        ? StorageClass.cloneData(_entry)
        : {};
    if (
      failedEntry.config === null ||
      failedEntry.config === undefined ||
      typeof failedEntry.config !== 'object'
    ) {
      failedEntry.config = {};
    }
    failedEntry.config.uuid = failedEntry.config.uuid ?? crypto.randomUUID();
    failedEntry.config.unix_timestamp =
      failedEntry.config.unix_timestamp ?? StorageClass.getUnixTimestamp();
    return failedEntry;
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
    const result = await this.addAndConfirm(_entry);
    return result.entry;
  }

  /**
   * Adds an entry and reports whether the changed collection reached disk.
   *
   * `add()` cannot carry that itself: it resolves the cloned entry, and its
   * callers read `.config.uuid` off it, so there is nowhere to put the answer
   * without breaking them. Callers that have to undo their work on a failed
   * write use this instead.
   */
  public async addAndConfirm(_entry): Promise<StorageClassAddResult> {
    let newEntry: any;
    let saved = false;
    try {
      newEntry = StorageClass.cloneData(this.prepareEntryForStorage(_entry));
      newEntry.config.uuid = crypto.randomUUID();
      newEntry.config.unix_timestamp = StorageClass.getUnixTimestamp();
      if (this.tracksChanges()) {
        stampAdded(
          newEntry.config,
          Date.now(),
          this.deviceIdentity.getDeviceId(),
        );
      }
      this.storedData.push(newEntry);
      saved = await this.__save();
      this.__sendEvent('ADD');
    } catch (ex) {
      newEntry = this.createFailedAddEntry(newEntry ?? _entry);
      this.uiLog.error('Storage - Add - Unsuccessfully', ex);
      await this.showAlertSafely(ex.message, 'ADD CRITICAL ERROR');
    }
    return { entry: StorageClass.cloneData(newEntry), saved };
  }

  public getAllEntries(): Array<any> {
    return this.storedData;
  }

  /**
   * Replaces the stored entry with the same uuid.
   *
   * For change tracked collections the change info is set as well: by
   * default it counts as a change by this device (updated_at, rev and
   * updated_by are set). `{ touch: false }` is the system write path for
   * migrations, backfills and similar maintenance; it keeps the change info
   * of the stored entry and counts nothing up.
   */
  public async update(
    _obj,
    _options: StorageWriteOptions = {},
  ): Promise<boolean> {
    try {
      let updatedObj = this.prepareEntryForStorage(_obj);
      let didUpdate: boolean = false;
      for (let i = 0; i < this.storedData.length; i++) {
        if (this.storedData[i].config.uuid === updatedObj.config.uuid) {
          this.uiLog.log(
            `Storage - Update  - Successfully - ${updatedObj.config.uuid}`,
          );
          if (this.tracksChanges()) {
            // Taken before anything is replaced: the caller's object can be
            // the stored entry itself or share its config with it.
            const previous = copyChangeInfo(this.storedData[i].config);
            if (updatedObj === _obj) {
              // Keep the stored entry apart from the caller's object, so
              // later unsaved changes to it cannot reach the disk unstamped
              // with the next write of another entry.
              updatedObj = StorageClass.cloneData(updatedObj);
            }
            stampUpdated(
              previous,
              updatedObj.config,
              Date.now(),
              this.deviceIdentity.getDeviceId(),
              _options.touch !== false,
            );
          }
          this.storedData[i] = updatedObj;
          const saved = await this.__save();
          this.__sendEvent('UPDATE');
          didUpdate = true;
          if (saved === false) {
            this.uiLog.error(
              `Storage - Update  - Unsucessfully - ${updatedObj.config.uuid} - save failed`,
            );
          }
          return saved;
        }
      }
      if (didUpdate === false) {
        this.uiLog.error(
          `Storage - Update  - Unsucessfully - ${updatedObj.config.uuid} - not found`,
        );
        await this.showAlertSafely(
          `Storage - Update  - Unsucessfully - ${updatedObj.config.uuid} - not found`,
          'CRITICAL ERROR',
        );
      }
      return false;
    } catch (ex) {
      this.uiLog.error(
        'Storage - Update  - Unsucessfully - Execption occured',
        ex,
      );
      await this.showAlertSafely(
        `Storage - Update  - Unsucessfully - Execption occured - ${ex.message}`,
        'CRITICAL ERROR',
      );
      return false;
    }
  }

  /**
   * System write path for filling in values on many entries at once, for
   * example in migrations. `_fill` changes the given stored entries in place
   * and returns how many it changed; the change info is not touched. The
   * collection is saved once, and only when something changed.
   *
   * Resolves whether the collection was saved (true when nothing had to be
   * saved).
   */
  public async backfillWithoutTouch(
    _fill: (entries: any[]) => number,
  ): Promise<boolean> {
    try {
      const changed = _fill(this.storedData);
      if (!changed) {
        return true;
      }
      const saved = await this.__save();
      // Lets the typed storages drop their cached objects.
      this.__sendEvent('UPDATE');
      if (saved === false) {
        this.uiLog.error(
          `Storage - Backfill - Unsuccessfully - ${this.DB_PATH} - save failed`,
        );
      }
      return saved;
    } catch (ex) {
      this.uiLog.error(
        `Storage - Backfill - Unsuccessfully - ${this.DB_PATH}`,
        ex,
      );
      return false;
    }
  }

  public async removeByObject(_obj: any): Promise<boolean> {
    try {
      if (_obj !== null && _obj !== undefined && _obj.config.uuid) {
        const deleteUUID = _obj.config.uuid;

        return await this.__delete(deleteUUID);
      }
      return false;
    } catch (ex) {
      this.uiLog.error('Storage - Delete - Unsuccessfully', ex);
      return false;
    }
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
    try {
      if (_beanUUID !== null && _beanUUID !== undefined && _beanUUID !== '') {
        return await this.__delete(_beanUUID);
      }
      return false;
    } catch (ex) {
      this.uiLog.error('Storage - Delete - Unsuccessfully', ex);
      return false;
    }
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
          this.__forgetExistingDeletions();
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

  private async __delete(_uuid: string): Promise<boolean> {
    try {
      if (_uuid !== null && _uuid !== undefined && _uuid !== '') {
        const deleteUUID = _uuid;
        for (let i = 0; i < this.storedData.length; i++) {
          if (this.storedData[i].config.uuid === deleteUUID) {
            this.uiLog.log(`Storage - Delete - Successfully -${deleteUUID}`);
            const rev = StorageClass.revisionOf(this.storedData[i]);
            this.storedData.splice(i, 1);
            const saved = await this.__save();
            this.__sendRemoveMessage(deleteUUID);
            this.__sendEvent('DELETE');
            if (saved === false) {
              this.uiLog.error(
                `Storage - Delete - Unsuccessfully - ${deleteUUID} - save failed`,
              );
            } else {
              // The note is written only after the collection was saved: if
              // the app stops in between, at most a note is missing, but no
              // note ever claims that a stored entry was deleted.
              await this.__noteDeletion(deleteUUID, rev);
            }
            return saved;
          }
        }
      }
      this.uiLog.error('Storage - Delete - Unsuccessfully');
      return false;
    } catch (ex) {
      this.uiLog.error('Storage - Delete - Unsuccessfully', ex);
      await this.showAlertSafely(ex.message, 'CRITICAL ERROR');
      return false;
    }
  }

  private static revisionOf(_entry: any): number {
    const rev = Number(_entry?.config?.rev);
    return Number.isFinite(rev) && rev > 0 ? rev : 0;
  }

  /** Never changes the result of the deletion. */
  private async __noteDeletion(_uuid: string, _rev: number): Promise<void> {
    if (!this.tracksChanges()) {
      return;
    }
    // Entries sharing a uuid are deleted one at a time; while a copy is
    // left, the entry still exists.
    if (this.storedData.some((_entry) => _entry?.config?.uuid === _uuid)) {
      this.uiLog.log(
        `Storage - Delete - ${_uuid} - another entry with this uuid is left, no deletion note`,
      );
      return;
    }
    try {
      await this.deletionJournal.record({
        collection: this.DB_PATH,
        uuid: _uuid,
        deleted_at: Date.now(),
        device_id: this.deviceIdentity.getDeviceId(),
        rev: _rev,
      });
    } catch {
      this.uiLog.log(`Storage - Delete - ${_uuid} - deletion note failed`);
    }
  }

  /**
   * Entries can exist again after they were deleted, for example when a
   * backup from before the deletion is imported. Their notes are dropped
   * from the deletion journal. Runs in the background.
   */
  private __forgetExistingDeletions(): void {
    if (!this.tracksChanges() || this.storedData.length === 0) {
      return;
    }
    try {
      const uuids = new Set<string>();
      for (const entry of this.storedData) {
        const uuid = entry?.config?.uuid;
        if (typeof uuid === 'string') {
          uuids.add(uuid);
        }
      }
      void this.deletionJournal
        .forgetExistingEntries(this.DB_PATH, uuids)
        .catch(() => undefined);
    } catch {
      // Never affects loading the collection.
    }
  }

  private async __save(): Promise<boolean> {
    try {
      return await this.uiStorage.set(this.DB_PATH, this.storedData).then(
        async (_saved) => {
          if (_saved === true) {
            this.uiLog.log('Storage - Save - Successfully');
            return true;
          } else {
            this.uiLog.error('Storage - Save Set - Unsuccessfully', _saved);
            await this.showAlertSafely(
              'Storage - Save Set - Unsuccessfully  - ' +
                JSON.stringify(_saved),
              'CRITICAL ERROR',
            );
            return false;
          }
        },
        async (e) => {
          this.uiLog.error('Storage - Save Set Exception - Unsuccessfully', e);
          await this.showAlertSafely(
            JSON.stringify(e),
            'CRITICAL ERROR - SAVE SET',
          );
          return false;
        },
      );
    } catch (ex) {
      this.uiLog.error('Storage - Save - Unsuccessfully', ex);
      await this.showAlertSafely(ex.message, 'CRITICAL ERROR');
      return false;
    }
  }
}
