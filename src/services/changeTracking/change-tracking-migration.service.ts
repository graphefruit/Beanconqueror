import { inject, Injectable } from '@angular/core';

import {
  FillChangeInfoStats,
  fillMissingChangeInfo,
} from '../../classes/changeTracking/changeTracking';
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
  filled: number;
  skipped: number;
  ms: number;
  saved: boolean;
}

/**
 * Data migration that fills in the change info of all stored entries and
 * stores the user profile of existing installations.
 *
 * It is safe to stop at any point: each collection is filled in memory and
 * written as one storage key, so an interrupted run leaves every collection
 * either completely filled or unchanged. As only missing values are filled
 * in, the next run continues where the last one stopped and writes nothing
 * for collections that are already done.
 */
@Injectable({
  providedIn: 'root',
})
export class ChangeTrackingMigrationService {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiGraphStorage = inject(UIGraphStorage);
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

  /**
   * Resolves true only when everything was stored. Otherwise the migration
   * stays open and runs again on the next start.
   */
  public async run(): Promise<boolean> {
    const start = performance.now();
    const results: Record<string, CollectionResult> = {};
    let success = true;

    for (const storage of this.trackedStorages()) {
      const result = await this.fillCollection(storage);
      results[storage.getDBPath()] = result;
      if (!result.saved) {
        success = false;
        // Stop here: the next start runs the migration again anyway.
        break;
      }
    }

    let settingsWritten = false;
    if (success) {
      const profile = await this.storeUserProfile();
      settingsWritten = profile === true;
      success = profile !== null;
    }

    const totalMs = Math.round(performance.now() - start);
    this.uiLog.info(
      `Change info migration - ${success ? 'done' : 'not finished'} in ${totalMs} ms`,
      {
        collections: results,
        filled: Object.values(results).reduce((s, r) => s + r.filled, 0),
        skipped: Object.values(results).reduce((s, r) => s + r.skipped, 0),
        settings_written: settingsWritten,
        total_ms: totalMs,
      },
    );
    return success;
  }

  private trackedStorages(): StorageClass[] {
    return [
      this.uiBeanStorage,
      this.uiBrewStorage,
      this.uiMillStorage,
      this.uiPreparationStorage,
      this.uiWaterStorage,
      this.uiGreenBeanStorage,
      this.uiRoastingMachineStorage,
      this.uiGraphStorage,
      this.uiBaristamodeBrewStorage,
    ];
  }

  private async fillCollection(
    _storage: StorageClass,
  ): Promise<CollectionResult> {
    const start = performance.now();
    const stats: FillChangeInfoStats = { skipped: 0 };
    let filled = 0;
    const saved = await _storage.backfillWithoutTouch((_entries) => {
      filled = fillMissingChangeInfo(_entries, stats);
      return filled;
    });
    return {
      filled,
      skipped: stats.skipped,
      ms: Math.round(performance.now() - start),
      saved,
    };
  }

  /**
   * Settings stored before the user profile existed get it written now. The
   * settings object in memory already carries the advanced mode for them
   * (see Settings.initializeByObject). New installations store the profile
   * when their settings are created, so nothing is written for them.
   *
   * Resolves true when the settings were written, false when nothing had to
   * be written and null when writing failed.
   */
  private async storeUserProfile(): Promise<boolean | null> {
    const stored: unknown = this.uiSettingsStorage.getAllEntries()[0];
    if (typeof stored !== 'object' || stored === null) {
      return false;
    }
    const user: unknown = (stored as { user?: unknown }).user;
    if (typeof user === 'object' && user !== null && !Array.isArray(user)) {
      return false;
    }
    const saved = await this.uiSettingsStorage.saveSettings(
      this.uiSettingsStorage.getSettings(),
    );
    return saved ? true : null;
  }
}
