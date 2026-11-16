import { inject } from '@angular/core';

import { cloneDeep } from 'lodash';
import { Observable, Subject } from 'rxjs';

import { IConfig } from '../interfaces/objectConfig/iObjectConfig';
import { DeletionJournalService } from '../services/deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../services/deviceIdentity/device-identity.service';
import type { UIAlert as UIAlertService } from '../services/uiAlert';
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

/**
 * Values of a new entry that the caller fixes beforehand, for example a uuid
 * that files belonging to the entry are named after before it is stored.
 * Left out, add() sets them.
 */
export interface StorageAddOptions {
  uuid?: string;
  unix_timestamp?: number;
}

export interface StorageWriteOptions {
  /**
   * Defaults to true. False is the system write path for migrations,
   * backfills and similar maintenance: the change info (updated_at, rev,
   * updated_by) of the entry is kept as it is.
   */
  touch?: boolean;
}

/** Changes to one collection that are saved together, see applyChanges(). */
export interface StorageChanges<T = unknown> {
  /** New entries; uuid, time and change info are set as add() sets them. */
  add?: readonly T[];
  /** Entries that replace the stored ones with their uuid, as update() does. */
  update?: readonly unknown[];
  /**
   * Entries in their stored form that replace the stored ones with their
   * uuid. Unlike `update` they are not prepared for storage, so nothing of
   * them changes but the change info.
   */
  updateStored?: readonly unknown[];
  /** Uuids of the entries to remove, see removeManyByUUID(). */
  remove?: readonly string[];
}

export interface StorageChangesResult<T = unknown> {
  saved: boolean;
  /** Copies of the added entries as they are stored; none when not saved. */
  added: T[];
}

interface StoredEntry {
  config: IConfig;
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
   * Entries by uuid for getByUUID, built on the first lookup for the
   * `storedData` array it was built from. Forgotten whenever this class
   * changes the entries.
   */
  private uuidIndex: Map<string, any> | undefined;
  private uuidIndexData: Array<any> | undefined;

  /**
   * -1 = Nothing started, or being read
   * 0 = Error occured
   * 1 = Initialized
   *
   * Only an initialized collection is written: `storedData` is empty
   * otherwise, but the stored entries are not known to be, and every write
   * stores the whole collection, so a write would replace them.
   */
  private isInitialized: number = -1;
  /** Callers of storageReady() from before the read that is running ended. */
  private readonly waitingForRead: Array<() => void> = [];

  /** One message about refused writes is enough, the remedy is a restart. */
  private static refusedWriteReported = false;

  private static messagesShown = 0;

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
    onRejected: (reason: unknown) => void,
    ...message: Parameters<UIAlertService['showMessage']>
  ): Promise<void> {
    const { UIAlert } = await import('../services/uiAlert');
    const alert = UIAlert.getInstance();
    if (alert) {
      StorageClass.messagesShown++;
      void alert.showMessage(...message)?.catch(onRejected);
    }
  }

  /**
   * How many messages the collections have shown to the user. Compared
   * around a write, it tells whether the user already knows of its failure,
   * so the caller does not put a second message on top.
   */
  public static getMessagesShown(): number {
    return StorageClass.messagesShown;
  }

  private async showAlertSafely(
    ...message: Parameters<UIAlertService['showMessage']>
  ): Promise<void> {
    const logAlertError = (ex: unknown) => {
      this.uiLog.error('Storage - Alert - Unsuccessfully', ex);
    };
    try {
      await this.showAlert(logAlertError, ...message);
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

  /**
   * Refuses a write while the collection is not initialized: logs it, tells
   * the user once and resolves true. Nothing is changed then, in memory or
   * stored, and no event is sent.
   */
  private async __refusesWrite(_action: string): Promise<boolean> {
    if (this.isInitialized === 1) {
      return false;
    }
    this.uiLog.error(
      `Storage - ${_action} - Unsuccessfully - ${this.DB_PATH} - not initialized (${this.isInitialized}), nothing was saved`,
    );
    if (!StorageClass.refusedWriteReported) {
      StorageClass.refusedWriteReported = true;
      await this.showAlertSafely(
        'STORAGE_NOT_READ_NOTHING_SAVED',
        undefined,
        undefined,
        true,
      );
    }
    return true;
  }

  public async initializeStorage() {
    await this.__initializeStorage();
  }

  public async storageReady(): Promise<any> {
    const already = this.isInitialized !== -1;
    while (this.isInitialized === -1) {
      await new Promise<void>((resolve) => this.waitingForRead.push(resolve));
    }
    if (this.isInitialized === 1) {
      this.uiLog.log(
        already
          ? `Storage ${this.DB_PATH} - already - ready`
          : `Storage ${this.DB_PATH} ready`,
      );
      return undefined;
    }
    this.uiLog.log(
      already
        ? `Storage ${this.DB_PATH} - already not - ready`
        : `Storage ${this.DB_PATH} not ready`,
    );
    return Promise.reject();
  }

  private __readFinished(_initialized: 0 | 1): void {
    this.isInitialized = _initialized;
    for (const proceed of this.waitingForRead.splice(0)) {
      proceed();
    }
  }

  public async reinitializeStorage() {
    this.uiLog.log(`Storage - Reinitialize ${this.DB_PATH}`);
    this.isInitialized = -1;
    try {
      await this.__initializeStorage();
    } finally {
      // Also when the entries could not be read: the ones read before are
      // gone, so the typed storages have to drop their cached objects.
      this.__sendEvent('REINITIALIZE');
    }
  }

  protected getInitializeValue(): number {
    return this.isInitialized;
  }

  /**
   * Whether the stored entries were read. Until then the collection looks
   * empty, so nothing may be concluded from an entry missing in it.
   */
  public isRead(): boolean {
    return this.isInitialized === 1;
  }

  public async add(_entry, _options: StorageAddOptions = {}): Promise<any> {
    const result = await this.addAndConfirm(_entry, _options);
    return result.entry;
  }

  /**
   * Adds an entry and reports whether the changed collection reached disk.
   * When it did not, the entry is not in the collection: the one resolved is
   * only what would have been stored.
   *
   * `add()` cannot carry that itself: it resolves the cloned entry, and its
   * callers read `.config.uuid` off it, so there is nowhere to put the answer
   * without breaking them. Callers that have to undo their work on a failed
   * write use this instead.
   */
  public async addAndConfirm(
    _entry,
    _options: StorageAddOptions = {},
  ): Promise<StorageClassAddResult> {
    let newEntry: any;
    let saved = false;
    if (await this.__refusesWrite('Add')) {
      return { entry: this.createFailedAddEntry(_entry), saved };
    }
    try {
      newEntry = this.createEntry(_entry, _options);
      const data = this.storedData;
      data.push(newEntry);
      this.forgetUuidIndex();
      saved = await this.__save();
      if (saved) {
        this.__sendEvent('ADD', newEntry.config.uuid);
      } else {
        this.__takeBack(data, () => {
          const at = data.lastIndexOf(newEntry);
          if (at >= 0) {
            data.splice(at, 1);
          }
        });
      }
    } catch (ex) {
      newEntry = this.createFailedAddEntry(newEntry ?? _entry);
      this.uiLog.error('Storage - Add - Unsuccessfully', ex);
      await this.showAlertSafely(ex.message, 'ADD CRITICAL ERROR');
    }
    return { entry: StorageClass.cloneData(newEntry), saved };
  }

  /** The entry as add() stores it: a copy with its uuid, time and change info. */
  private createEntry(
    _entry: unknown,
    _options: StorageAddOptions = {},
  ): StoredEntry {
    const newEntry: StoredEntry = StorageClass.cloneData(
      this.prepareEntryForStorage(_entry),
    );
    newEntry.config.uuid = _options.uuid ?? crypto.randomUUID();
    newEntry.config.unix_timestamp =
      _options.unix_timestamp ?? StorageClass.getUnixTimestamp();
    if (this.tracksChanges()) {
      stampAdded(
        newEntry.config,
        Date.now(),
        this.deviceIdentity.getDeviceId(),
      );
    }
    return newEntry;
  }

  /**
   * The entry that replaces `_stored`: `_updatedObj`, the caller's `_obj`
   * prepared for storage, with its change info in tracked collections.
   */
  private stampReplacement(
    _obj: unknown,
    _updatedObj: StoredEntry,
    _stored: StoredEntry,
    _touch: boolean,
  ): StoredEntry {
    if (!this.tracksChanges()) {
      return _updatedObj;
    }
    // Taken before anything is replaced: the caller's object can be the
    // stored entry itself or share its config with it.
    const previous = copyChangeInfo(_stored.config);
    if (_updatedObj === _obj) {
      // Keep the stored entry apart from the caller's object, so later
      // unsaved changes to it cannot reach the disk unstamped with the next
      // write of another entry.
      _updatedObj = StorageClass.cloneData(_updatedObj);
    }
    stampUpdated(
      previous,
      _updatedObj.config,
      Date.now(),
      this.deviceIdentity.getDeviceId(),
      _touch,
    );
    return _updatedObj;
  }

  public getAllEntries(): Array<any> {
    return this.storedData;
  }

  /**
   * The entries in their stored form and order, for the stores: not the
   * class instances that typed storages build in `getAllEntries()`. It is the
   * array this class keeps, not a copy, so neither it nor an entry may be
   * changed through it. Empty while the collection is being read.
   */
  public getRawEntries(): readonly unknown[] {
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
   *
   * When the collection could not be saved, the stored entry is the one from
   * before again, see applyChanges().
   */
  public async update(
    _obj,
    _options: StorageWriteOptions = {},
  ): Promise<boolean> {
    if (await this.__refusesWrite('Update')) {
      return false;
    }
    try {
      let updatedObj = this.prepareEntryForStorage(_obj);
      let didUpdate: boolean = false;
      for (let i = 0; i < this.storedData.length; i++) {
        if (this.storedData[i].config.uuid === updatedObj.config.uuid) {
          this.uiLog.log(
            `Storage - Update  - Successfully - ${updatedObj.config.uuid}`,
          );
          const data = this.storedData;
          const previous = data[i];
          updatedObj = this.stampReplacement(
            _obj,
            updatedObj,
            previous,
            _options.touch !== false,
          );
          data[i] = updatedObj;
          this.forgetUuidIndex();
          const saved = await this.__save();
          didUpdate = true;
          if (saved) {
            this.__sendEvent('UPDATE', updatedObj.config.uuid);
          } else {
            this.uiLog.error(
              `Storage - Update  - Unsucessfully - ${updatedObj.config.uuid} - save failed`,
            );
            this.__takeBack(data, () => {
              const at = data.indexOf(updatedObj);
              if (at >= 0) {
                data[at] = previous;
              }
            });
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
    if (await this.__refusesWrite('Backfill')) {
      return false;
    }
    try {
      const changed = _fill(this.storedData);
      this.forgetUuidIndex();
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
      const indexed = this.getUuidIndex().get(_uuid);
      if (indexed?.config?.uuid === _uuid) {
        return indexed;
      }
      // Entries changed from outside, through getAllEntries(), are not in
      // the index; looking through all entries still finds them.
      for (const data of this.storedData) {
        if (data.config.uuid === _uuid) {
          return data;
        }
      }
    }
  }

  private getUuidIndex(): Map<string, any> {
    if (
      this.uuidIndex === undefined ||
      this.uuidIndexData !== this.storedData
    ) {
      this.uuidIndex = new Map();
      this.uuidIndexData = this.storedData;
      for (const data of this.storedData) {
        const uuid = data?.config?.uuid;
        // The first entry wins, as when looking through all entries.
        if (!this.uuidIndex.has(uuid)) {
          this.uuidIndex.set(uuid, data);
        }
      }
    }
    return this.uuidIndex;
  }

  private forgetUuidIndex(): void {
    this.uuidIndex = undefined;
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

  /**
   * Removes the entries with these uuids and saves the collection once. A
   * uuid removes one entry each time it is in the list, the first stored one,
   * as deleting them one by one does.
   *
   * Resolves whether the collection is saved without them; true as well when
   * there was nothing to remove. When it could not be saved, the entries are
   * back where they were and nothing is reported as removed.
   */
  public async removeManyByUUID(_uuids: readonly string[]): Promise<boolean> {
    return (await this.applyChanges({ remove: _uuids })).saved;
  }

  /**
   * Replaces the stored entries with the uuids of these and saves the
   * collection once. Each entry gets the change info update() gives it.
   * Resolves whether all of them are saved; otherwise none is changed.
   */
  public async updateMany(_entries: readonly unknown[]): Promise<boolean> {
    return (await this.applyChanges({ update: _entries })).saved;
  }

  /**
   * Adds these entries and saves the collection once. Each entry gets the
   * uuid, time and change info add() gives it. When the collection could not
   * be saved, none of them is left in it.
   */
  public addMany<T>(_entries: readonly T[]): Promise<StorageChangesResult<T>> {
    return this.applyChanges({ add: _entries });
  }

  /**
   * Replaces (`update`, then `updateStored`), removes and adds entries, in
   * this order, and saves the collection once: all of it is stored or
   * nothing. An entry that is in `update` several times is replaced each
   * time, as updating one by one does.
   *
   * Resolves `saved` true as well when there was nothing to change. Nothing
   * is changed and `saved` is false while the collection takes no writes,
   * when an entry to update is not stored or cannot be prepared, and when
   * the collection could not be saved: the entries in memory are then the
   * ones from before. Objects the caller changed beforehand stay changed.
   *
   * Known gap: writes of one collection are not queued. When another write
   * of this collection is saved while the save of this call fails, that
   * write has stored the changes of this call with it; they are taken back
   * in memory only and stay on the device until the next save of the
   * collection.
   *
   * Events are sent and deletion notes written only after the save: one
   * event for the call, naming the replaced and added entries in `uuids`.
   */
  public async applyChanges<T>(
    _changes: StorageChanges<T>,
  ): Promise<StorageChangesResult<T>> {
    const unsaved: StorageChangesResult<T> = { saved: false, added: [] };
    if (await this.__refusesWrite('Write')) {
      return unsaved;
    }
    const data: StoredEntry[] = this.storedData;
    const replacements = new Map<number, StoredEntry>();
    let added: StoredEntry[];
    try {
      const toPrepare = _changes.update ?? [];
      const updates = [...toPrepare, ...(_changes.updateStored ?? [])];
      const firstIndex = new Map<string, number>();
      if (updates.length > 0) {
        for (let i = data.length - 1; i >= 0; i--) {
          firstIndex.set(data[i]?.config?.uuid, i);
        }
      }
      for (const [position, update] of updates.entries()) {
        const prepared: StoredEntry =
          position < toPrepare.length
            ? this.prepareEntryForStorage(update)
            : (update as StoredEntry);
        const index = firstIndex.get(prepared.config.uuid);
        if (index === undefined) {
          this.uiLog.error(
            `Storage - Write - Unsuccessfully - ${this.DB_PATH} - ${prepared.config.uuid} - not found, nothing was saved`,
          );
          return unsaved;
        }
        replacements.set(
          index,
          this.stampReplacement(
            update,
            prepared,
            replacements.get(index) ?? data[index],
            true,
          ),
        );
      }
      added = (_changes.add ?? []).map((_entry) => this.createEntry(_entry));
    } catch (ex) {
      this.uiLog.error(
        `Storage - Write - Unsuccessfully - ${this.DB_PATH} - nothing was saved`,
        ex,
      );
      return unsaved;
    }

    // Nothing above changed the entries; from here on nothing throws until
    // the save.
    const replaced: { previous: StoredEntry; entry: StoredEntry }[] = [];
    for (const [index, entry] of replacements) {
      replaced.push({ previous: data[index], entry });
      data[index] = entry;
    }
    const wanted = new Map<string, number>();
    for (const uuid of _changes.remove ?? []) {
      if (uuid) {
        wanted.set(uuid, (wanted.get(uuid) ?? 0) + 1);
      }
    }
    const removed: { index: number; entry: StoredEntry }[] = [];
    if (wanted.size > 0) {
      for (let i = 0; i < data.length; i++) {
        const uuid = data[i]?.config?.uuid;
        const left = wanted.get(uuid) ?? 0;
        if (left > 0) {
          wanted.set(uuid, left - 1);
          removed.push({ index: i, entry: data[i] });
        } else {
          data[i - removed.length] = data[i];
        }
      }
      data.length -= removed.length;
    }
    for (const entry of added) {
      data.push(entry);
    }
    const changed = replaced.length + removed.length + added.length;
    if (changed === 0) {
      return { saved: true, added: [] };
    }
    this.forgetUuidIndex();

    if (!(await this.__save())) {
      this.uiLog.error(
        `Storage - Write - Unsuccessfully - ${this.DB_PATH} - ${changed} entries - save failed`,
      );
      this.__takeBack(data, () => {
        for (const { index, entry } of removed) {
          data.splice(Math.min(index, data.length), 0, entry);
        }
        const previousOf = new Map(
          replaced.map(({ previous, entry }) => [entry, previous]),
        );
        const dropped = new Set(added);
        let kept = 0;
        for (const entry of data) {
          if (!dropped.has(entry)) {
            data[kept++] = previousOf.get(entry) ?? entry;
          }
        }
        data.length = kept;
      });
      return unsaved;
    }

    this.uiLog.log(
      `Storage - Write - Successfully - ${this.DB_PATH} - ${replaced.length} replaced, ${removed.length} removed, ${added.length} added`,
    );
    for (const { entry } of removed) {
      this.__sendRemoveMessage(entry.config.uuid);
    }
    const uuids = [...replaced.map(({ entry }) => entry), ...added].map(
      (_entry) => _entry.config.uuid,
    );
    if (uuids.length === 0) {
      this.__sendEvent('DELETE');
    } else {
      this.eventSubject.next({
        type: replaced.length + removed.length > 0 ? 'UPDATE' : 'ADD',
        uuids,
      });
    }
    if (removed.length > 0) {
      // The notes are written only after the collection was saved, as for a
      // single deletion.
      await this.__noteDeletions(removed.map((_removed) => _removed.entry));
    }
    return { saved: true, added: StorageClass.cloneData(added) as T[] };
  }

  /**
   * After a failed save of `_data`: `_undo` takes each change of the write
   * back by itself, so entries written meanwhile by others stay. Entries read
   * anew meanwhile are the stored ones; nothing of the write belongs into
   * them.
   */
  private __takeBack(_data: StoredEntry[], _undo: () => void): void {
    if (this.storedData !== _data) {
      return;
    }
    _undo();
    this.forgetUuidIndex();
    // Lets the typed storages drop their cached objects.
    this.__sendEvent('UPDATE');
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

  /**
   * `_uuid` names the entry that was added or updated. Events about the
   * whole collection (DELETE, REINITIALIZE, backfills) carry none; the one
   * event of applyChanges() names its entries in `uuids` instead.
   */
  private __sendEvent(_type: string, _uuid?: string) {
    if (_uuid === undefined) {
      this.eventSubject.next({ type: _type });
    } else {
      this.eventSubject.next({ type: _type, uuid: _uuid });
    }
  }

  public getDBPath(): string {
    return this.DB_PATH;
  }

  /**
   * Reads the stored entries. A collection that could not be read is not an
   * empty one: this rejects, storageReady() rejects, and the collection
   * refuses every write until it was read (see `isInitialized`), so the stored
   * entries are never replaced by entries added to an empty list.
   */
  protected async __initializeStorage() {
    this.storedData = [];
    this.isInitialized = -1;
    const promise = new Promise((resolve, reject) => {
      this.uiLog.log(`Initialize Storage - ${this.DB_PATH}`);
      this.uiStorage.getOrFail(this.DB_PATH).then(
        (_data) => {
          if (_data === null || _data === undefined) {
            this.uiLog.log(`Storage empty but successfull - ${this.DB_PATH}`);
            // No beans have been added yet
            this.storedData = [];
            this.__readFinished(1);
          } else {
            this.uiLog.log(`Storage successfull - ${this.DB_PATH}`);
            try {
              this.uiLog.log(
                `Storage successfull - ${this.DB_PATH} - Data amount: ${_data.length}`,
              );
            } catch (ex) {}

            this.storedData = _data;
            this.__readFinished(1);
          }
          this.__forgetExistingDeletions();
          resolve(undefined);
        },
        (e) => {
          // Error
          this.uiLog.error(
            `Storage error - ${this.DB_PATH} - could not be read, it is not written until it was`,
            e,
          );
          this.storedData = [];
          this.__readFinished(0);
          reject();
        },
      );
    });
    return promise;
  }

  private async __delete(_uuid: string): Promise<boolean> {
    if (await this.__refusesWrite('Delete')) {
      return false;
    }
    try {
      if (_uuid !== null && _uuid !== undefined && _uuid !== '') {
        const deleteUUID = _uuid;
        for (let i = 0; i < this.storedData.length; i++) {
          if (this.storedData[i].config.uuid === deleteUUID) {
            this.uiLog.log(`Storage - Delete - Successfully -${deleteUUID}`);
            const data = this.storedData;
            const entry = data[i];
            data.splice(i, 1);
            this.forgetUuidIndex();
            const saved = await this.__save();
            if (saved === false) {
              this.uiLog.error(
                `Storage - Delete - Unsuccessfully - ${deleteUUID} - save failed`,
              );
              this.__takeBack(data, () => {
                data.splice(Math.min(i, data.length), 0, entry);
              });
            } else {
              this.__sendRemoveMessage(deleteUUID);
              this.__sendEvent('DELETE');
              // The note is written only after the collection was saved: if
              // the app stops in between, at most a note is missing, but no
              // note ever claims that a stored entry was deleted.
              await this.__noteDeletion(
                deleteUUID,
                StorageClass.revisionOf(entry),
              );
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
   * One journal write for all entries; while a copy sharing the uuid is
   * left, the entry still exists and gets no note.
   */
  private async __noteDeletions(_removed: StoredEntry[]): Promise<void> {
    if (!this.tracksChanges()) {
      return;
    }
    const left = new Set<string>();
    for (const entry of this.storedData) {
      left.add(entry?.config?.uuid);
    }
    const revisions = new Map<string, number>();
    for (const entry of _removed) {
      if (!left.has(entry.config.uuid)) {
        revisions.set(entry.config.uuid, StorageClass.revisionOf(entry));
      }
    }
    const deletedAt = Date.now();
    const deviceId = this.deviceIdentity.getDeviceId();
    await this.deletionJournal.recordMany(
      Array.from(revisions, ([uuid, rev]) => ({
        collection: this.DB_PATH,
        uuid,
        deleted_at: deletedAt,
        device_id: deviceId,
        rev,
      })),
    );
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
            await this.__reportSaveFailed();
            return false;
          }
        },
        async (e) => {
          this.uiLog.error('Storage - Save Set Exception - Unsuccessfully', e);
          await this.__reportSaveFailed();
          return false;
        },
      );
    } catch (ex) {
      this.uiLog.error('Storage - Save - Unsuccessfully', ex);
      await this.__reportSaveFailed();
      return false;
    }
  }

  /** The reason is in the log only, the user cannot act on it. */
  private async __reportSaveFailed(): Promise<void> {
    await this.showAlertSafely(
      'STORAGE_SAVE_FAILED',
      undefined,
      undefined,
      true,
    );
  }
}
