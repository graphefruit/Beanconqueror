import { inject, Injectable } from '@angular/core';

import {
  countChangedEntries,
  DuplicateCleanupResult,
  removeDuplicateEntries,
} from '../../classes/changeTracking/duplicateEntries';
import { StorageClass } from '../../classes/storageClass';
import { UIBaristamodeBrewStorage } from '../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIGraphStorage } from '../uiGraphStorage.service';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIWaterStorage } from '../uiWaterStorage';

interface CollectionResult {
  groups: number;
  entries: number;
  removed: number;
  renamed: number;
  kept: number;
  ms: number;
  saved: boolean;
}

/**
 * Data migration that cleans up entries sharing a uuid in all change tracked
 * collections (see removeDuplicateEntries): identical copies are removed,
 * differing copies get a new uuid when nothing depends on the shared one and
 * are kept as they are otherwise.
 *
 * Each collection is cleaned in memory and written once through the system
 * write path, and only when something changed. The change info of the
 * entries stays as it is and nothing is written to the deletion journal. An
 * interrupted run leaves every collection either cleaned or unchanged; the
 * next run continues with the collections that still contain copies and
 * writes nothing for the others.
 */
@Injectable({
  providedIn: 'root',
})
export class DuplicateEntriesMigrationService {
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
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

  /**
   * Resolves true only when every changed collection was stored. Otherwise
   * the migration stays open and runs again on the next start.
   */
  public async run(): Promise<boolean> {
    const start = performance.now();
    const results: Record<string, CollectionResult> = {};
    let success = true;

    for (const storage of this.storages) {
      const result = await this.cleanCollection(storage);
      if (result.groups > 0) {
        results[storage.getDBPath()] = result;
      }
      if (!result.saved) {
        success = false;
        // Stop here: the next start runs the migration again anyway.
        break;
      }
    }

    const totalMs = Math.round(performance.now() - start);
    const sum = (_field: 'groups' | 'removed' | 'renamed' | 'kept') =>
      Object.values(results).reduce((_s, _r) => _s + _r[_field], 0);
    this.uiLog.info(
      `Duplicate entries migration - ${success ? 'done' : 'not finished'} in ${totalMs} ms`,
      {
        collections: results,
        groups: sum('groups'),
        removed: sum('removed'),
        renamed: sum('renamed'),
        kept: sum('kept'),
        total_ms: totalMs,
      },
    );
    return success;
  }

  private async cleanCollection(
    _storage: StorageClass,
  ): Promise<CollectionResult> {
    const start = performance.now();
    const collection = _storage.getDBPath();
    // Set by the fill callback; stays undefined when it could not run.
    let result = undefined as DuplicateCleanupResult | undefined;
    const saved = await _storage.backfillWithoutTouch((_entries) => {
      result = removeDuplicateEntries(
        collection,
        _entries,
        this.storedData(),
        () => crypto.randomUUID(),
      );
      return countChangedEntries(result);
    });
    if (result !== undefined) {
      this.logDecisions(collection, result, saved);
    }
    return {
      groups: result?.groups ?? 0,
      entries: result?.entries ?? 0,
      removed: result?.removed ?? 0,
      renamed: result?.renamed.length ?? 0,
      kept: result?.kept.length ?? 0,
      ms: Math.round(performance.now() - start),
      saved,
    };
  }

  /** Every copy that keeps a shared uuid or gets a new one is logged. */
  private logDecisions(
    _collection: string,
    _result: DuplicateCleanupResult,
    _saved: boolean,
  ): void {
    const stored = _saved ? '' : ' (not stored yet)';
    for (const uuid of _result.kept) {
      this.uiLog.info(
        `Duplicate entries migration - ${_collection} - ${uuid} - differing copies kept, the uuid is referenced`,
      );
    }
    for (const renamed of _result.renamed) {
      this.uiLog.info(
        `Duplicate entries migration - ${_collection} - ${renamed.uuid} - differing copy got the uuid ${renamed.new_uuid}${stored}`,
      );
    }
  }

  /**
   * The stored entries of all collections and the settings, by storage key,
   * to look for references. The typed storages build class objects from
   * them, these are the entries as stored.
   */
  private storedData(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const storage of [...this.storages, this.uiSettingsStorage]) {
      data[storage.getDBPath()] =
        StorageClass.prototype.getAllEntries.call(storage);
    }
    return data;
  }
}
