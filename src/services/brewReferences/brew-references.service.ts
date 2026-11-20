import { inject, Service } from '@angular/core';

import { Mill } from '../../classes/mill/mill';
import { IBrewPageFilter } from '../../interfaces/brew/iBrewPageFilter';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';

interface StoredEntry {
  config?: { uuid?: unknown };
}

interface StoredBrew extends StoredEntry {
  bean?: unknown;
  mill?: unknown;
  method_of_preparation?: unknown;
  method_of_preparation_tools?: unknown;
}

interface StoredPreparation extends StoredEntry {
  tools?: unknown;
}

/**
 * Looks after the entries a brew refers to. It reads the entries as they
 * are stored and builds no objects for them.
 */
@Service()
export class BrewReferencesService {
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

  /**
   * A preparation tool belongs to one preparation. Takes every tool out of
   * a brew that is not in the tool list of the preparation of this brew;
   * archived tools are in that list; a preparation stored without a list
   * has no tools. A brew whose preparation is not stored stays as it is.
   * The brew filters of the settings lose the tools that no preparation
   * has.
   *
   * All changed brews are stored with one save and count as changed by
   * this device, so a later sync sees them; nothing else of them changes.
   * The others are not touched.
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
      const changed: StoredBrew[] = [];
      for (const { entry, tools } of candidates) {
        const uuid = entry.config?.uuid;
        if (typeof uuid !== 'string' || uuid === '' || shared.has(uuid)) {
          continue;
        }
        // The brew as it is stored with another tool list. No Brew object:
        // building and storing one fills in missing fields and converts
        // numbers kept as text, and only the tools are to change.
        changed.push({ ...entry, method_of_preparation_tools: tools });
      }

      const brewsSaved = (
        await this.uiBrewStorage.applyChanges({ updateStored: changed })
      ).saved;
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
   * Brews from before there were grinders: when there are brews and no
   * grinder, adds the grinder "Standard" and points every brew at it. Their
   * change info is kept.
   *
   * The brews are written first, with the uuid the grinder gets. When the
   * grinder is then not stored there is still no grinder, and the next run
   * points the brews at a new one; a grinder stored first would end every
   * later run before the brews point at it.
   *
   * Resolves true when everything is stored or nothing had to be; false
   * when the brews or the grinders are not read or a write failed.
   */
  public async addStandardMill(): Promise<boolean> {
    if (!this.uiBrewStorage.isRead() || !this.uiMillStorage.isRead()) {
      return false;
    }
    if (
      this.uiBrewStorage.getRawEntries().length === 0 ||
      this.uiMillStorage.getRawEntries().length > 0
    ) {
      return true;
    }
    const mill = new Mill();
    mill.name = 'Standard';
    const uuid = crypto.randomUUID();
    const brewsSaved = await this.uiBrewStorage.backfillWithoutTouch(
      (_brews: StoredBrew[]) => {
        for (const brew of _brews) {
          brew.mill = uuid;
        }
        return _brews.length;
      },
    );
    return (
      brewsSaved &&
      (await this.uiMillStorage.addAndConfirm(mill, { uuid })).saved
    );
  }

  /**
   * Writes into the log how many brews refer to a bean, a grinder or a
   * preparation that is not stored. Changes nothing. Only counts when all
   * four collections are read; a reference that is empty is none.
   */
  public logMissingReferences(): void {
    try {
      const storages = [
        this.uiBrewStorage,
        this.uiBeanStorage,
        this.uiMillStorage,
        this.uiPreparationStorage,
      ];
      if (!storages.every((_storage) => _storage.isRead())) {
        this.uiLog.info('Brew references - not counted, not everything read');
        return;
      }
      const beans = storedUuids(this.uiBeanStorage.getRawEntries());
      const mills = storedUuids(this.uiMillStorage.getRawEntries());
      const preparations = storedUuids(
        this.uiPreparationStorage.getRawEntries(),
      );
      const isMissing = (_uuid: unknown, _stored: Set<unknown>) =>
        typeof _uuid === 'string' && _uuid !== '' && !_stored.has(_uuid);
      const brews = this.uiBrewStorage.getRawEntries() as (StoredBrew | null)[];
      let bean = 0;
      let mill = 0;
      let preparation = 0;
      for (const brew of brews) {
        if (isMissing(brew?.bean, beans)) {
          bean++;
        }
        if (isMissing(brew?.mill, mills)) {
          mill++;
        }
        if (isMissing(brew?.method_of_preparation, preparations)) {
          preparation++;
        }
      }
      // Numbers only: uuids and names stay out of the log.
      this.uiLog.info('Brew references - brews referring to missing entries', {
        brews: brews.length,
        missing_bean: bean,
        missing_mill: mill,
        missing_preparation: preparation,
      });
    } catch (ex) {
      this.uiLog.error('Brew references - could not be counted', ex);
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

function storedUuids(_entries: readonly unknown[]): Set<unknown> {
  const uuids = new Set<unknown>();
  for (const entry of _entries as (StoredEntry | null)[]) {
    uuids.add(entry?.config?.uuid);
  }
  return uuids;
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
