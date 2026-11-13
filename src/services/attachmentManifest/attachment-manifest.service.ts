import { inject, Injectable } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { Directory, Filesystem } from '@capacitor/filesystem';
import { Subscription } from 'rxjs';

import {
  AttachmentRef,
  collectAttachmentRefs,
  mimeFromPath,
  resolveForStat,
} from '../../classes/changeTracking/attachmentRefs';
import { ATTACHMENT_MANIFEST_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { StorageClass } from '../../classes/storageClass';
import {
  IAttachmentManifest,
  IAttachmentManifestEntry,
} from '../../interfaces/changeTracking/iAttachmentManifest';
import { UIBaristamodeBrewStorage } from '../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UIGraphStorage } from '../uiGraphStorage.service';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UIStorage } from '../uiStorage';
import { UIWaterStorage } from '../uiWaterStorage';

/** A referenced file as it should be in the manifest. */
interface WantedAttachment {
  key: string;
  collection: string;
  owner_uuid: string;
  ref: AttachmentRef;
  owner_updated_at: number;
}

/**
 * Keeps the attachment manifest: one entry per photo or flow profile file
 * referenced by a stored entry, with path, size, type and owner. Nothing
 * else reads it yet, and it changes nothing that is visible.
 *
 * The manifest is derived from the stored entries and the files, so it can
 * always be built again. It stays on this device under a local-only key:
 * it is not written into backups and an import never replaces it.
 *
 * Building it for existing data runs in the background after the app is
 * ready, in small portions, and stores its progress; a build that was
 * stopped continues on the next start. New or changed entries are checked
 * shortly after they were stored.
 *
 * Only on native platforms; in the browser there are no files to check and
 * the service does nothing.
 */
@Injectable({
  providedIn: 'root',
})
export class AttachmentManifestService {
  /** Stat calls per portion; the event loop runs between portions. */
  public static readonly STAT_PORTION = 25;
  /** Progress is stored at least after this many checked files. */
  public static readonly PROGRESS_EVERY = 200;
  /** Wait after an entry was stored, so files written after it exist. */
  public static readonly OWNER_CHECK_DELAY_MS = 1000;
  /** Least time between two writes of the manifest. */
  public static readonly SAVE_DELAY_MS = 2000;
  /** Quiet time after collections were reloaded, for example by an import. */
  public static readonly REBUILD_DELAY_MS = 5000;

  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly platform = inject(Platform);
  private readonly storages: StorageClass[] = [
    inject(UIBeanStorage),
    inject(UIBrewStorage),
    inject(UIMillStorage),
    inject(UIPreparationStorage),
    inject(UIWaterStorage),
    inject(UIGreenBeanStorage),
    inject(UIRoastingMachineStorage),
    inject(UIGraphStorage),
    inject(UIBaristamodeBrewStorage),
  ];

  private readonly entries = new Map<string, IAttachmentManifestEntry>();
  private completedAt = 0;
  private started: Promise<void> | undefined;
  private readonly subscriptions: Subscription[] = [];

  private building: Promise<void> | undefined;
  private buildingGeneration = -1;
  private stopped = false;
  /** Raised when the collections were reloaded; a running build stops. */
  private generation = 0;
  /** Owners changed while a build runs; the build leaves them alone. */
  private readonly changedOwners = new Set<string>();
  private rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly ownerTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private saveQueue: Promise<void> = Promise.resolve();

  /** True on the platforms that store attachment files. */
  public isSupported(): boolean {
    return (
      this.platform.is('capacitor') &&
      (this.platform.is('ios') || this.platform.is('android'))
    );
  }

  /**
   * Loads the manifest, follows changes of the entries and starts building
   * it in the background. Does not wait for the build and never rejects.
   * Runs only once.
   */
  public start(): Promise<void> {
    if (this.started === undefined) {
      this.started = this.__start().catch((ex) => {
        this.__logFailure('start failed', ex);
      });
    }
    return this.started;
  }

  /**
   * Brings the manifest up to date with all stored entries. Files are
   * checked when they are new to the manifest, were not found before, were
   * never checked or their owner changed after the last check. Only one
   * build runs at a time: a request during a build waits for it, and when
   * the collections were reloaded since that build began, builds once more
   * afterwards. Never rejects.
   */
  public reconcile(): Promise<void> {
    if (!this.isSupported() || this.stopped) {
      return Promise.resolve();
    }
    if (this.building !== undefined) {
      if (this.buildingGeneration === this.generation) {
        return this.building;
      }
      return this.building.then(() => this.reconcile());
    }
    this.buildingGeneration = this.generation;
    this.building = this.__build()
      .catch((ex) => {
        this.__logFailure('build failed', ex);
      })
      .finally(() => {
        this.building = undefined;
      });
    return this.building;
  }

  /** For tests and diagnosis only. */
  public getManifest(): IAttachmentManifest {
    return {
      version: 1,
      completed_at: this.completedAt,
      entries: [...this.entries.values()].map((_entry) => ({ ..._entry })),
    };
  }

  /** Stores pending changes now. For tests and diagnosis only. */
  public async flush(): Promise<void> {
    this.__clearSaveTimer();
    await this.__save();
  }

  /** Stops following changes and building. For tests only. */
  public stop(): void {
    this.stopped = true;
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }
    this.subscriptions.length = 0;
    this.__clearSaveTimer();
    if (this.rebuildTimer !== undefined) {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = undefined;
    }
    for (const timer of this.ownerTimers.values()) {
      clearTimeout(timer);
    }
    this.ownerTimers.clear();
    this.generation++;
  }

  /** Looks up one file. Rejects when it does not exist. */
  protected async statFile(
    _path: string,
    _directory: Directory | undefined,
  ): Promise<{ size: number }> {
    const info = await Filesystem.stat(
      _directory === undefined
        ? { path: _path }
        : { path: _path, directory: _directory },
    );
    return { size: info.size };
  }

  private async __start(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }
    await this.__load();
    for (const storage of this.storages) {
      const collection = storage.getDBPath();
      this.subscriptions.push(
        storage.attachOnEvent().subscribe((_event: any) => {
          this.__onEvent(storage, collection, _event);
        }),
        storage.attachOnRemove().subscribe((_event: any) => {
          this.__onRemove(collection, _event?.id);
        }),
      );
    }
    void this.reconcile();
  }

  private async __load(): Promise<void> {
    let stored: any;
    try {
      stored = await this.uiStorage.get(ATTACHMENT_MANIFEST_STORAGE_KEY);
    } catch (ex) {
      this.__logFailure('stored manifest could not be read', ex);
    }
    if (
      stored === null ||
      typeof stored !== 'object' ||
      stored.version !== 1 ||
      !Array.isArray(stored.entries)
    ) {
      if (stored !== null && stored !== undefined) {
        this.uiLog.info(
          'AttachmentManifestService - stored manifest is not valid and is built again',
        );
      }
      return;
    }
    this.completedAt =
      typeof stored.completed_at === 'number' ? stored.completed_at : 0;
    for (const entry of stored.entries) {
      if (AttachmentManifestService.isValidEntry(entry)) {
        this.entries.set(
          AttachmentManifestService.keyOf(
            entry.collection,
            entry.owner_uuid,
            entry.path,
          ),
          { ...entry },
        );
      }
    }
    this.uiLog.log(
      `AttachmentManifestService - ${this.entries.size} entries read`,
    );
  }

  private __onEvent(
    _storage: StorageClass,
    _collection: string,
    _event: any,
  ): void {
    const type = _event?.type;
    if ((type === 'ADD' || type === 'UPDATE') && _event.uuid) {
      this.__scheduleOwnerCheck(_storage, _collection, _event.uuid);
    } else if (type === 'REINITIALIZE') {
      this.__scheduleRebuild();
    }
  }

  private __onRemove(_collection: string, _uuid: unknown): void {
    if (typeof _uuid !== 'string') {
      return;
    }
    const owner = AttachmentManifestService.ownerOf(_collection, _uuid);
    this.__markChanged(owner);
    const timer = this.ownerTimers.get(owner);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.ownerTimers.delete(owner);
    }
    // Entries sharing a uuid are removed one at a time; the files of a copy
    // that is left stay in the manifest.
    const storage = this.storages.find((_s) => _s.getDBPath() === _collection);
    if (storage !== undefined) {
      this.__scheduleOwnerCheck(storage, _collection, _uuid, 0);
      return;
    }
    this.__removeOwner(owner);
  }

  /** Collections were reloaded, for example by an import: check all again. */
  private __scheduleRebuild(): void {
    this.generation++;
    // Files can have been replaced by the import as well.
    for (const entry of this.entries.values()) {
      entry.checked_at = 0;
    }
    this.__scheduleSave();
    if (this.rebuildTimer !== undefined) {
      clearTimeout(this.rebuildTimer);
    }
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = undefined;
      void this.reconcile();
    }, AttachmentManifestService.REBUILD_DELAY_MS);
  }

  private __scheduleOwnerCheck(
    _storage: StorageClass,
    _collection: string,
    _uuid: string,
    _delay = AttachmentManifestService.OWNER_CHECK_DELAY_MS,
  ): void {
    const owner = AttachmentManifestService.ownerOf(_collection, _uuid);
    this.__markChanged(owner);
    const previous = this.ownerTimers.get(owner);
    if (previous !== undefined) {
      clearTimeout(previous);
    }
    this.ownerTimers.set(
      owner,
      setTimeout(() => {
        this.ownerTimers.delete(owner);
        void this.__checkOwner(_storage, _collection, _uuid).catch((ex) => {
          this.__logFailure('check of a changed entry failed', ex);
        });
      }, _delay),
    );
  }

  private __markChanged(_owner: string): void {
    if (this.building !== undefined) {
      this.changedOwners.add(_owner);
    }
  }

  /** Checks all files of one owner again. */
  private async __checkOwner(
    _storage: StorageClass,
    _collection: string,
    _uuid: string,
  ): Promise<void> {
    const owner = AttachmentManifestService.ownerOf(_collection, _uuid);
    const wanted = new Map<string, AttachmentRef>();
    for (const raw of AttachmentManifestService.rawEntriesOf(_storage)) {
      if (raw?.config?.uuid === _uuid) {
        for (const ref of collectAttachmentRefs(_collection, raw)) {
          wanted.set(
            AttachmentManifestService.keyOf(_collection, _uuid, ref.path),
            ref,
          );
        }
      }
    }
    const isIos = this.platform.is('ios');
    const directory = this.uiFileHelper.getDataDirectory();
    const checked = new Map<string, IAttachmentManifestEntry>();
    for (const [key, ref] of wanted) {
      checked.set(
        key,
        await this.__checkFile(_collection, _uuid, ref, isIos, directory),
      );
    }
    // A newer check of this owner may have been scheduled meanwhile.
    if (this.ownerTimers.has(owner)) {
      return;
    }
    this.__removeOwner(owner);
    for (const [key, entry] of checked) {
      this.entries.set(key, entry);
    }
    this.__scheduleSave();
  }

  private __removeOwner(_owner: string): void {
    let removed = false;
    for (const [key, entry] of this.entries) {
      if (
        AttachmentManifestService.ownerOf(
          entry.collection,
          entry.owner_uuid,
        ) === _owner
      ) {
        this.entries.delete(key);
        removed = true;
      }
    }
    if (removed) {
      this.__scheduleSave();
    }
  }

  private async __build(): Promise<void> {
    const generation = this.generation;
    const started = Date.now();
    this.changedOwners.clear();

    const wanted = this.__collectWanted();
    let removed = 0;
    for (const key of [...this.entries.keys()]) {
      if (!wanted.has(key)) {
        this.entries.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.dirty = true;
    }

    const toCheck = [...wanted.values()].filter((_wanted) => {
      const entry = this.entries.get(_wanted.key);
      return (
        entry?.size === null ||
        entry === undefined ||
        entry.checked_at <= 0 ||
        _wanted.owner_updated_at > entry.checked_at
      );
    });

    const isIos = this.platform.is('ios');
    const directory = this.uiFileHelper.getDataDirectory();
    let checkedSinceProgress = 0;
    for (
      let i = 0;
      i < toCheck.length;
      i += AttachmentManifestService.STAT_PORTION
    ) {
      const portion = toCheck.slice(
        i,
        i + AttachmentManifestService.STAT_PORTION,
      );
      const results = await Promise.all(
        portion.map((_wanted) =>
          this.__checkFile(
            _wanted.collection,
            _wanted.owner_uuid,
            _wanted.ref,
            isIos,
            directory,
          ),
        ),
      );
      // The collections were reloaded; a new build is already scheduled.
      if (generation !== this.generation) {
        return;
      }
      portion.forEach((_wanted, _index) => {
        const owner = AttachmentManifestService.ownerOf(
          _wanted.collection,
          _wanted.owner_uuid,
        );
        // Changed owners are checked by themselves, with the current data.
        if (!this.changedOwners.has(owner)) {
          this.entries.set(_wanted.key, results[_index]);
        }
      });
      this.dirty = true;
      checkedSinceProgress += portion.length;
      if (checkedSinceProgress >= AttachmentManifestService.PROGRESS_EVERY) {
        checkedSinceProgress = 0;
        this.__scheduleSave();
      }
      await new Promise((_resolve) => setTimeout(_resolve, 0));
      // The collections were reloaded; a new build is already scheduled.
      if (generation !== this.generation) {
        return;
      }
    }

    this.completedAt = Date.now();
    this.dirty = true;
    await this.flush();
    this.uiLog.log(
      `AttachmentManifestService - built: ${this.entries.size} files, ${toCheck.length} checked, ${removed} removed, ${Date.now() - started} ms`,
    );
  }

  private __collectWanted(): Map<string, WantedAttachment> {
    const wanted = new Map<string, WantedAttachment>();
    for (const storage of this.storages) {
      const collection = storage.getDBPath();
      for (const raw of AttachmentManifestService.rawEntriesOf(storage)) {
        const uuid = raw?.config?.uuid;
        if (typeof uuid !== 'string' || uuid === '') {
          continue;
        }
        const updatedAt = Number(raw.config.updated_at);
        for (const ref of collectAttachmentRefs(collection, raw)) {
          const key = AttachmentManifestService.keyOf(
            collection,
            uuid,
            ref.path,
          );
          const ownerUpdatedAt = Number.isFinite(updatedAt) ? updatedAt : 0;
          const known = wanted.get(key);
          // Entries sharing a uuid: the newest change counts.
          if (known === undefined || ownerUpdatedAt > known.owner_updated_at) {
            wanted.set(key, {
              key,
              collection,
              owner_uuid: uuid,
              ref,
              owner_updated_at: ownerUpdatedAt,
            });
          }
        }
      }
    }
    return wanted;
  }

  private async __checkFile(
    _collection: string,
    _ownerUuid: string,
    _ref: AttachmentRef,
    _isIos: boolean,
    _directory: Directory,
  ): Promise<IAttachmentManifestEntry> {
    const target = resolveForStat(_ref.path, _isIos);
    let size: number | null = null;
    try {
      const info = await this.statFile(
        target.path,
        target.absolute ? undefined : _directory,
      );
      size =
        typeof info?.size === 'number' && Number.isFinite(info.size)
          ? info.size
          : null;
    } catch {
      size = null;
    }
    return {
      path: _ref.path,
      collection: _collection,
      owner_uuid: _ownerUuid,
      kind: _ref.kind,
      mime: mimeFromPath(_ref.path),
      size,
      checked_at: Date.now(),
    };
  }

  /** Stores the manifest at most every SAVE_DELAY_MS. */
  private __scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer !== undefined) {
      return;
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.__save();
    }, AttachmentManifestService.SAVE_DELAY_MS);
  }

  private __clearSaveTimer(): void {
    if (this.saveTimer !== undefined) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  /** Writes run one after another; each writes the newest state. */
  private __save(): Promise<void> {
    const run = this.saveQueue.then(async () => {
      if (!this.dirty) {
        return;
      }
      this.dirty = false;
      try {
        await this.uiStorage.set(
          ATTACHMENT_MANIFEST_STORAGE_KEY,
          this.getManifest(),
        );
      } catch (ex) {
        this.dirty = true;
        this.__logFailure('manifest could not be stored', ex);
      }
    });
    this.saveQueue = run;
    return run;
  }

  private __logFailure(_message: string, _ex: unknown): void {
    try {
      this.uiLog.info(
        'AttachmentManifestService - ' +
          _message +
          ' - ' +
          (_ex instanceof Error ? _ex.message : 'unknown'),
      );
    } catch {
      // Logging must not change the result.
    }
  }

  /** The stored entries, not the class objects the typed storages build. */
  private static rawEntriesOf(_storage: StorageClass): any[] {
    const entries = StorageClass.prototype.getAllEntries.call(_storage);
    return Array.isArray(entries) ? entries : [];
  }

  private static ownerOf(_collection: string, _uuid: string): string {
    return _collection + '\u0000' + _uuid;
  }

  private static keyOf(
    _collection: string,
    _uuid: string,
    _path: string,
  ): string {
    return _collection + '\u0000' + _uuid + '\u0000' + _path;
  }

  private static isValidEntry(
    _value: unknown,
  ): _value is IAttachmentManifestEntry {
    const entry = _value as Partial<IAttachmentManifestEntry> | null;
    return (
      typeof entry === 'object' &&
      entry !== null &&
      typeof entry.path === 'string' &&
      entry.path !== '' &&
      typeof entry.collection === 'string' &&
      typeof entry.owner_uuid === 'string' &&
      typeof entry.kind === 'string' &&
      typeof entry.mime === 'string' &&
      (entry.size === null || typeof entry.size === 'number') &&
      typeof entry.checked_at === 'number'
    );
  }
}
