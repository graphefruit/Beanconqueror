import { inject, Service } from '@angular/core';

import { StorageClass } from '../classes/storageClass';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewStorage } from '../services/uiBrewStorage';
import { UIGreenBeanStorage } from '../services/uiGreenBeanStorage';
import { UILog } from '../services/uiLog';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationStorage } from '../services/uiPreparationStorage';

type Removal = [storage: StorageClass, uuids: string[]];
type Stored = Record<string, unknown> & { config?: { uuid?: string } };

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
  private readonly uiLog = inject(UILog);

  /** The bean and its brews. */
  public deleteBean(_uuid: string): Promise<boolean> {
    return this.delete(this.uiBeanStorage, _uuid, () => [
      this.brewsWith('bean', new Set([_uuid])),
    ]);
  }

  /** The mill and the brews ground with it. */
  public deleteMill(_uuid: string): Promise<boolean> {
    return this.delete(this.uiMillStorage, _uuid, () => [
      this.brewsWith('mill', new Set([_uuid])),
    ]);
  }

  /** The preparation method and the brews made with it. */
  public deletePreparation(_uuid: string): Promise<boolean> {
    return this.delete(this.uiPreparationStorage, _uuid, () => [
      this.brewsWith('method_of_preparation', new Set([_uuid])),
    ]);
  }

  /** The green bean, the beans roasted from it and their brews. */
  public deleteGreenBean(_uuid: string): Promise<boolean> {
    return this.delete(this.uiGreenBeanStorage, _uuid, () => {
      const beans = DeleteCommands.uuidsWhere(
        this.uiBeanStorage,
        (_bean) =>
          (_bean.bean_roast_information as { bean_uuid?: unknown } | undefined)
            ?.bean_uuid === _uuid,
      );
      return [
        this.brewsWith('bean', new Set(beans)),
        [this.uiBeanStorage, beans],
      ];
    });
  }

  private brewsWith(_field: string, _owners: ReadonlySet<unknown>): Removal {
    return [
      this.uiBrewStorage,
      DeleteCommands.uuidsWhere(this.uiBrewStorage, (_brew) =>
        _owners.has(_brew[_field]),
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
    _dependents: () => Removal[],
  ): Promise<boolean> {
    try {
      if (!_storage.getByUUID(_uuid)) {
        return false;
      }
      const removals: Removal[] = [..._dependents(), [_storage, [_uuid]]];
      // An empty list removes nothing but tells whether the collection
      // takes writes.
      for (const [storage] of removals) {
        if (!(await storage.removeManyByUUID([]))) {
          return false;
        }
      }
      for (const [storage, uuids] of removals) {
        if (!(await storage.removeManyByUUID(uuids))) {
          return false;
        }
      }
      return true;
    } catch (ex) {
      this.uiLog.error(
        `DeleteCommands - ${_storage.DB_PATH} - Unsuccessfully`,
        ex,
      );
      return false;
    }
  }
}
