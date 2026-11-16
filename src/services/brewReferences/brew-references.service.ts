import { inject, Service } from '@angular/core';

import { Brew } from '../../classes/brew/brew';
import { IBrew } from '../../interfaces/brew/iBrew';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { UIBrewStorage } from '../uiBrewStorage';
import { UILog } from '../uiLog';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';

interface StoredEntry {
  config?: { uuid?: unknown };
}

interface StoredBrew extends StoredEntry {
  method_of_preparation?: unknown;
  method_of_preparation_tools?: unknown;
}

interface StoredPreparation extends StoredEntry {
  tools?: unknown;
}

/**
 * Looks after the entries a brew refers to. It reads the entries as they
 * are stored, so no objects are built for the brews that stay as they are.
 */
@Service()
export class BrewReferencesService {
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

  /**
   * A preparation tool belongs to one preparation. Takes every tool out of
   * a brew that is not in the tool list of the preparation of this brew;
   * archived tools are in that list. A brew whose preparation is not stored
   * stays as it is. The brew filters of the settings lose the tools that no
   * preparation has.
   *
   * All changed brews are stored with one save and count as changed by
   * this device, so a later sync sees them; the others are not touched.
   *
   * Resolves true when everything is stored or nothing had to be. False
   * when the brews or the preparations are not read (every tool would look
   * foreign) or something could not be saved: the brews are then the ones
   * from before and the caller runs it again at the next start.
   */
  public async removeForeignTools(): Promise<boolean> {
    const start = performance.now();
    if (!this.uiBrewStorage.isRead() || !this.uiPreparationStorage.isRead()) {
      this.uiLog.info(
        'Foreign brew tools - brews or preparations are not read, nothing was changed',
      );
      return false;
    }
    try {
      const toolsOf = this.toolsByPreparation();
      const brews = this.uiBrewStorage.getRawEntries() as (StoredBrew | null)[];
      const candidates: { entry: StoredBrew; tools: unknown[] }[] = [];
      let withoutPreparation = 0;
      for (const entry of brews) {
        const own = toolsOf.get(entry?.method_of_preparation as string);
        if (own === undefined) {
          withoutPreparation++;
          continue;
        }
        const tools = entry.method_of_preparation_tools;
        if (!Array.isArray(tools)) {
          continue;
        }
        const kept = tools.filter((_tool) => own.has(_tool));
        if (kept.length !== tools.length) {
          candidates.push({ entry, tools: kept });
        }
      }

      // A brew is replaced by its uuid. Copies that share one cannot be
      // told apart that way, so they stay as they are.
      const shared = candidates.length > 0 ? sharedUuids(brews) : new Set();
      const changed: Brew[] = [];
      for (const { entry, tools } of candidates) {
        const uuid = entry.config?.uuid;
        if (typeof uuid !== 'string' || uuid === '' || shared.has(uuid)) {
          continue;
        }
        // A new object with a list of its own: the stored brew stays as it
        // is when the save fails.
        const brew = new Brew();
        brew.initializeByObject(entry as IBrew);
        brew.method_of_preparation_tools = tools as string[];
        changed.push(brew);
      }

      const brewsSaved = await this.uiBrewStorage.updateMany(changed);
      const filter = brewsSaved
        ? await this.cleanBrewFilters(toolsOf)
        : { removed: 0, saved: false };
      const done = brewsSaved && filter.saved;
      // Numbers only: uuids and names stay out of the log.
      this.uiLog.info(
        `Foreign brew tools - ${done ? 'done' : 'not finished'} in ${Math.round(performance.now() - start)} ms`,
        {
          brews: brews.length,
          changed: brewsSaved ? changed.length : 0,
          without_preparation: withoutPreparation,
          left_sharing_a_uuid: candidates.length - changed.length,
          removed_from_filters: filter.removed,
        },
      );
      return done;
    } catch (ex) {
      this.uiLog.error('Foreign brew tools - Unsuccessfully', ex);
      return false;
    }
  }

  /**
   * The tool uuids of each stored preparation. Preparations that share a
   * uuid count as one with the tools of all of them.
   */
  private toolsByPreparation(): Map<string, Set<unknown>> {
    const toolsOf = new Map<string, Set<unknown>>();
    for (const preparation of this.uiPreparationStorage.getRawEntries() as (StoredPreparation | null)[]) {
      const uuid = preparation?.config?.uuid;
      if (typeof uuid !== 'string') {
        continue;
      }
      const tools = toolsOf.get(uuid) ?? new Set<unknown>();
      toolsOf.set(uuid, tools);
      if (Array.isArray(preparation.tools)) {
        for (const tool of preparation.tools as (StoredEntry | null)[]) {
          tools.add(tool?.config?.uuid);
        }
      }
    }
    return toolsOf;
  }

  /**
   * Takes the tools that no preparation has out of the stored brew filters
   * and saves the settings when one changed. The filters are the ones from
   * before when the settings could not be saved.
   */
  private async cleanBrewFilters(
    _toolsOf: Map<string, Set<unknown>>,
  ): Promise<{ removed: number; saved: boolean }> {
    const known = new Set<unknown>();
    for (const tools of _toolsOf.values()) {
      for (const tool of tools) {
        known.add(tool);
      }
    }
    const settings = this.uiSettingsStorage.getSettings();
    const previous: { filter: IBrewPageFilter; tools: string[] }[] = [];
    let removed = 0;
    for (const filter of [
      settings.brew_filter?.OPEN,
      settings.brew_filter?.ARCHIVED,
    ]) {
      const tools: unknown = filter?.method_of_preparation_tools;
      if (!Array.isArray(tools)) {
        continue;
      }
      const kept = (tools as string[]).filter((_tool) => known.has(_tool));
      if (kept.length !== tools.length) {
        previous.push({ filter, tools });
        removed += tools.length - kept.length;
        filter.method_of_preparation_tools = kept;
      }
    }
    if (previous.length === 0) {
      return { removed, saved: true };
    }
    if (await this.uiSettingsStorage.saveSettings(settings)) {
      return { removed, saved: true };
    }
    for (const { filter, tools } of previous) {
      filter.method_of_preparation_tools = tools;
    }
    return { removed: 0, saved: false };
  }
}

/** The uuids that more than one of the entries has. */
function sharedUuids(_entries: readonly (StoredEntry | null)[]): Set<unknown> {
  const seen = new Set<unknown>();
  const shared = new Set<unknown>();
  for (const entry of _entries) {
    const uuid = entry?.config?.uuid;
    if (seen.has(uuid)) {
      shared.add(uuid);
    }
    seen.add(uuid);
  }
  return shared;
}
