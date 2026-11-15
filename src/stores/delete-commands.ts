import { inject, Service } from '@angular/core';

import { PENDING_DELETION_STORAGE_KEY } from '../classes/changeTracking/localStorageKeys';
import { StorageClass } from '../classes/storageClass';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewStorage } from '../services/uiBrewStorage';
import { UIGreenBeanStorage } from '../services/uiGreenBeanStorage';
import { UILog } from '../services/uiLog';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationStorage } from '../services/uiPreparationStorage';
import { UIStorage } from '../services/uiStorage';

type Removal = [storage: StorageClass, uuids: string[]];
type Stored = Record<string, unknown> & { config?: { uuid?: string } };

/** Stored while an entry and the entries depending on it are deleted. */
interface PendingDeletion {
  collection: string;
  uuid: string;
  started_at: number;
}

/**
 * Deletes an entry together with the entries that depend on it, with one
 * save per collection: the dependent entries first, so an entry never
 * disappears while others still point to it, then the entry.
 *
 * Every command resolves whether all of it is gone and never rejects.
 * Nothing is deleted when the entry is unknown, when one of the collections
 * does not take writes or when the first one could not be saved. Only when
 * a later one could not be saved, the entry is left without the dependent
 * entries deleted until then.
 */
@Service()
export class DeleteCommands {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);

  /** What goes along with an entry of each collection. */
  private readonly dependents = new Map<
    StorageClass,
    (_uuid: string) => Removal[]
  >([
    [this.uiBeanStorage, (_uuid) => [this.brewsWith('bean', _uuid)]],
    [this.uiMillStorage, (_uuid) => [this.brewsWith('mill', _uuid)]],
    [
      this.uiPreparationStorage,
      (_uuid) => [this.brewsWith('method_of_preparation', _uuid)],
    ],
    [
      this.uiGreenBeanStorage,
      (_uuid) => {
        const beans = DeleteCommands.uuidsWhere(
          this.uiBeanStorage,
          (_bean) =>
            (
              _bean.bean_roast_information as
                { bean_uuid?: unknown } | undefined
            )?.bean_uuid === _uuid,
        );
        return [this.brewsWith('bean', ...beans), [this.uiBeanStorage, beans]];
      },
    ],
  ]);

  /** The bean and its brews. */
  public deleteBean(_uuid: string): Promise<boolean> {
    return this.delete(this.uiBeanStorage, _uuid);
  }

  /** The mill and the brews ground with it. */
  public deleteMill(_uuid: string): Promise<boolean> {
    return this.delete(this.uiMillStorage, _uuid);
  }

  /** The preparation method and the brews made with it. */
  public deletePreparation(_uuid: string): Promise<boolean> {
    return this.delete(this.uiPreparationStorage, _uuid);
  }

  /** The green bean, the beans roasted from it and their brews. */
  public deleteGreenBean(_uuid: string): Promise<boolean> {
    return this.delete(this.uiGreenBeanStorage, _uuid);
  }

  private brewsWith(_field: string, ..._uuids: string[]): Removal {
    const owners = new Set<unknown>(_uuids);
    return [
      this.uiBrewStorage,
      DeleteCommands.uuidsWhere(this.uiBrewStorage, (_brew) =>
        owners.has(_brew[_field]),
      ),
    ];
  }

  /**
   * From the stored form: building a Brew for each of 30,000 entries would
   * take longer than the deletion.
   */
  private static uuidsWhere(
    _storage: StorageClass,
    _matches: (_entry: Stored) => boolean,
  ): string[] {
    const uuids: string[] = [];
    for (const entry of _storage.getRawEntries() as (Stored | null)[]) {
      if (entry && _matches(entry) && entry.config?.uuid) {
        uuids.push(entry.config.uuid);
      }
    }
    return uuids;
  }

  private async delete(
    _storage: StorageClass,
    _uuid: string,
  ): Promise<boolean> {
    try {
      if (!_storage.getByUUID(_uuid)) {
        return false;
      }
      const removals: Removal[] = [
        ...this.dependents.get(_storage)(_uuid),
        [_storage, [_uuid]],
      ];
      // An empty list removes nothing but tells whether the collection
      // takes writes.
      for (const [storage] of removals) {
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
      if (!(await this.uiStorage.set(PENDING_DELETION_STORAGE_KEY, note))) {
        return false;
      }
      try {
        for (const [storage, uuids] of removals) {
          if (!(await storage.removeManyByUUID(uuids))) {
            return false;
          }
        }
        return true;
      } finally {
        // Whatever the result: the user sees it and decides what is next.
        await this.uiStorage
          .remove(PENDING_DELETION_STORAGE_KEY)
          .catch((ex: unknown) =>
            this.uiLog.error('DeleteCommands - note not removed', ex),
          );
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
