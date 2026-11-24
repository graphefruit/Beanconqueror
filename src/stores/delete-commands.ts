import { inject, Service } from '@angular/core';

import {
  LAST_RESTORE_STORAGE_KEY,
  PENDING_DELETION_STORAGE_KEY,
} from '../classes/changeTracking/localStorageKeys';
import { StorageClass } from '../classes/storageClass';
import { IRestoreNote } from '../interfaces/changeTracking/iRestoreNote';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewStorage } from '../services/uiBrewStorage';
import { UIExportImportHelper } from '../services/uiExportImportHelper';
import { UIGreenBeanStorage } from '../services/uiGreenBeanStorage';
import { UILog } from '../services/uiLog';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationStorage } from '../services/uiPreparationStorage';
import { UIStorage } from '../services/uiStorage';
import {
  beansRoastedFrom,
  brewsDeletedWith,
  Owner,
  StoredEntry,
} from './delete-rules';

type Removal = [storage: StorageClass, uuids: string[]];

/**
 * What became of a deletion. After `reported` a collection has told the user
 * about the failure, and the caller shows no message of its own; after
 * `failed` nobody has.
 */
export type Deletion = 'deleted' | 'failed' | 'reported';

/** Stored while an entry and the entries depending on it are deleted. */
interface PendingDeletion {
  collection: string;
  uuid: string;
  started_at: number;
}

/**
 * An interruption is noticed at the next start. An older note is one that
 * was left behind, and nothing is deleted that long after the user asked.
 */
const PENDING_DELETION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes an entry together with the entries that depend on it, with one
 * save per collection: the dependent entries first, so an entry never
 * disappears while others still point to it, then the entry.
 *
 * Every command resolves what became of it and never rejects: `deleted`
 * only when all of it is gone. Nothing is deleted when the entry is unknown,
 * when one of the collections does not take writes or when the first one
 * could not be saved. Only when a later one could not be saved, the entry is
 * left without the dependent entries deleted until then.
 */
@Service()
export class DeleteCommands {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiStorage = inject(UIStorage);
  private readonly uiExportImportHelper = inject(UIExportImportHelper);
  private readonly uiLog = inject(UILog);

  /** The collections whose entries take brews along. */
  private readonly owners = new Map<StorageClass, Owner>([
    [this.uiBeanStorage, 'bean'],
    [this.uiMillStorage, 'mill'],
    [this.uiPreparationStorage, 'preparation'],
    [this.uiGreenBeanStorage, 'greenBean'],
  ]);

  /** The number of brews that deleting the entry now would take along. */
  public brewCount(_owner: Owner, _uuid: string): number {
    return brewsDeletedWith(_owner, _uuid, this.stored()).length;
  }

  /** The bean and its brews. */
  public deleteBean(_uuid: string): Promise<Deletion> {
    return this.delete(this.uiBeanStorage, _uuid);
  }

  /** The mill and the brews ground with it. */
  public deleteMill(_uuid: string): Promise<Deletion> {
    return this.delete(this.uiMillStorage, _uuid);
  }

  /** The preparation method and the brews made with it. */
  public deletePreparation(_uuid: string): Promise<Deletion> {
    return this.delete(this.uiPreparationStorage, _uuid);
  }

  /** The green bean, the beans roasted from it and their brews. */
  public deleteGreenBean(_uuid: string): Promise<Deletion> {
    return this.delete(this.uiGreenBeanStorage, _uuid);
  }

  /**
   * Called once when the app starts, and only after every collection was
   * read completely, as it decides by the entries in memory: finishes a
   * deletion that the app did not return from. It only ever goes forward:
   * the entry is deleted when nothing depends on it any more, and never
   * what depends on it. The note is removed first, so it is acted on at
   * most once, and nothing is done
   *
   * - when a backup was imported since, or restoring one was begun at this
   *   start and not completed,
   * - when the note lies in the future, as the clock was set back since,
   *   or is older than PENDING_DELETION_MAX_AGE_MS,
   * - when the note, or the one about the last import, cannot be read or
   *   the note cannot be removed.
   *
   * Never rejects. It shows nothing itself, but reading the notes ends in
   * the database dialog of UIStorage when the database cannot be read.
   */
  public async finishInterrupted(): Promise<void> {
    try {
      const note: unknown = await this.uiStorage.getOrFail(
        PENDING_DELETION_STORAGE_KEY,
      );
      if (note === null || note === undefined) {
        return;
      }
      await this.uiStorage.remove(PENDING_DELETION_STORAGE_KEY);
      const { collection, uuid, started_at } = note as Partial<PendingDeletion>;
      const storage = [...this.owners.keys()].find(
        (_storage) => _storage.DB_PATH === collection,
      );
      if (
        !storage ||
        typeof uuid !== 'string' ||
        typeof started_at !== 'number' ||
        !Number.isFinite(started_at)
      ) {
        this.uiLog.error('DeleteCommands - Interrupted - invalid note dropped');
        return;
      }
      const restore = (await this.uiStorage.getOrFail(
        LAST_RESTORE_STORAGE_KEY,
      )) as Partial<IRestoreNote> | null;
      const restored =
        restore !== null &&
        restore !== undefined &&
        !(restore.last_restore_at < started_at);
      const age = Date.now() - started_at;
      const finish =
        !this.uiExportImportHelper.restoreAtStartFailed() &&
        !restored &&
        age >= 0 &&
        age <= PENDING_DELETION_MAX_AGE_MS &&
        storage.getByUUID(uuid) !== undefined &&
        this.dependents(storage, uuid).every(
          ([, uuids]) => uuids.length === 0,
        ) &&
        (await storage.removeManyByUUID([uuid]));
      this.uiLog.log(
        `DeleteCommands - Interrupted - ${storage.DB_PATH} - ${finish ? 'entry deleted' : 'nothing deleted'}`,
      );
    } catch (ex) {
      this.uiLog.error('DeleteCommands - Interrupted - Unsuccessfully', ex);
    }
  }

  private stored(): { beans: StoredEntry[]; brews: StoredEntry[] } {
    return {
      beans: this.uiBeanStorage.getRawEntries() as StoredEntry[],
      brews: this.uiBrewStorage.getRawEntries() as StoredEntry[],
    };
  }

  /** What goes along with an entry of the collection. */
  private dependents(_storage: StorageClass, _uuid: string): Removal[] {
    const owner = this.owners.get(_storage);
    const stored = this.stored();
    const brews: Removal = [
      this.uiBrewStorage,
      brewsDeletedWith(owner, _uuid, stored),
    ];
    return owner === 'greenBean'
      ? [brews, [this.uiBeanStorage, beansRoastedFrom(stored.beans, _uuid)]]
      : [brews];
  }

  private async delete(
    _storage: StorageClass,
    _uuid: string,
  ): Promise<Deletion> {
    const shown = StorageClass.getMessagesShown();
    if (await this.remove(_storage, _uuid)) {
      return 'deleted';
    }
    return StorageClass.getMessagesShown() === shown ? 'failed' : 'reported';
  }

  /** Resolves whether all of it is gone. */
  private async remove(
    _storage: StorageClass,
    _uuid: string,
  ): Promise<boolean> {
    try {
      if (!_storage.getByUUID(_uuid)) {
        return false;
      }
      const removals = (): Removal[] => [
        ...this.dependents(_storage, _uuid),
        [_storage, [_uuid]],
      ];
      // An empty list removes nothing but tells whether the collection
      // takes writes.
      for (const [storage] of removals()) {
        if (!(await storage.removeManyByUUID([]))) {
          return false;
        }
      }
      const note: PendingDeletion = {
        collection: _storage.DB_PATH,
        uuid: _uuid,
        started_at: Date.now(),
      };
      // Rejects when the note cannot be stored: nothing is deleted then.
      await this.uiStorage.set(PENDING_DELETION_STORAGE_KEY, note);
      try {
        // Looked up anew: what came to depend on the entry while the note
        // was written goes along.
        for (const [storage, uuids] of removals()) {
          if (!(await storage.removeManyByUUID(uuids))) {
            return false;
          }
        }
        return true;
      } finally {
        // Whatever the result: the user sees it and decides what is next.
        // Tried again, so a single failure does not leave the note behind.
        // A note left behind lets the next start delete the entry, also
        // when this command failed.
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await this.uiStorage.remove(PENDING_DELETION_STORAGE_KEY);
            break;
          } catch (ex) {
            this.uiLog.error('DeleteCommands - note not removed', ex);
          }
        }
      }
    } catch (ex) {
      this.uiLog.error(
        `DeleteCommands - ${_storage.DB_PATH} - Unsuccessfully`,
        ex,
      );
      return false;
    }
  }
}
