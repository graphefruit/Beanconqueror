import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import {
  APPLIED_DATA_VERSIONS,
  BREW_TIERS,
  generateDataSet,
  isOpenBrew,
  NOTE_SEARCH_TERM,
  SyntheticDataSet,
} from '../../../e2e/support/synthetic-data';
import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import {
  CHANGE_TRACKED_COLLECTIONS,
  fillMissingChangeInfo,
} from '../../classes/changeTracking/changeTracking';
import { LOCAL_ONLY_STORAGE_KEYS } from '../../classes/changeTracking/localStorageKeys';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { PreparationTool } from '../../classes/preparation/preparationTool';
import { Settings } from '../../classes/settings/settings';
import { Version } from '../../classes/version/iVersion';
import { Water } from '../../classes/water/water';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { PREPARATION_TYPES } from '../../enums/preparations/preparationTypes';
import { WATER_TYPES } from '../../enums/water/waterTypes';
import { WATER_UNIT } from '../../enums/water/waterUnit';
import { WATER_UNIT_TDS } from '../../enums/water/waterUnitTds';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { ChangeTrackingMigrationService } from '../../services/changeTracking/change-tracking-migration.service';
import { UIAlert } from '../../services/uiAlert';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIHelper } from '../../services/uiHelper';
import { UILog } from '../../services/uiLog';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIStorage } from '../../services/uiStorage';
import { UIUpdate } from '../../services/uiUpdate';
import { UiVersionStorage } from '../../services/uiVersionStorage';

/**
 * The update check the app runs at every start (`UIUpdate`), with the data set's version entry.
 * The other services are empty stubs: the tests only look at what the check decides to do.
 */
function startUpCheck(versionEntry: SyntheticDataSet['VERSION'][number]) {
  const version = new Version();
  // A copy: the check pushes into the arrays of the version entry.
  version.initializeByObject(structuredClone(versionEntry));
  const saveVersion = jasmine.createSpy('saveVersion').and.resolveTo(undefined);
  const runChangeInfoMigration = jasmine
    .createSpy('ChangeTrackingMigrationService.run')
    .and.resolveTo(true);
  const openModal = jasmine.createSpy('ModalController.create').and.resolveTo({
    present: () => Promise.resolve(),
    onWillDismiss: () => Promise.resolve({}),
  });

  TestBed.configureTestingModule({
    providers: [
      UIUpdate,
      {
        provide: UiVersionStorage,
        useValue: { getVersion: () => version, saveVersion },
      },
      {
        provide: UIStorage,
        useValue: { getDataState: () => Promise.resolve('data') },
      },
      { provide: ModalController, useValue: { create: openModal } },
      // Not the native app: the update screens are checked against the web build's version.
      { provide: Platform, useValue: { is: () => false } },
      {
        provide: UILog,
        useValue: {
          info: () => undefined,
          log: () => undefined,
          error: () => undefined,
        },
      },
      { provide: UIAlert, useValue: { isLoadingSpinnerShown: () => false } },
      {
        provide: ChangeTrackingMigrationService,
        useValue: { run: runChangeInfoMigration },
      },
      ...[
        UIBrewStorage,
        UIMillStorage,
        UIBeanStorage,
        UIPreparationStorage,
        UISettingsStorage,
        UIFileHelper,
        TranslateService,
        UIHelper,
      ].map((token) => ({ provide: token, useValue: {} })),
    ],
  });
  return {
    update: TestBed.inject(UIUpdate),
    version,
    saveVersion,
    openModal,
    runChangeInfoMigration,
  };
}

/** Field paths of an object as the database stores it (JSON shape, arrays are leaves). */
function fieldPaths(value: unknown, prefix = ''): string[] {
  const stored = JSON.parse(JSON.stringify(value));
  const paths: string[] = [];
  const walk = (node: unknown, path: string) => {
    if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
      const keys = Object.keys(node);
      if (keys.length === 0 && path) {
        paths.push(path);
      }
      for (const key of keys) {
        walk(node[key], path ? `${path}.${key}` : key);
      }
    } else {
      paths.push(path);
    }
  };
  walk(stored, prefix);
  return paths.sort();
}

/**
 * Field paths of a new entry once it is stored in a collection with change info: the class
 * leaves the change info out, the storage and the change info migration add it.
 */
function trackedFieldPaths(entry: object): string[] {
  expect(fillMissingChangeInfo([entry])).toBe(1);
  return fieldPaths(entry);
}

/** Hour of the day (UTC, with fraction) of a unix timestamp. */
function hourOfDay(unix: number): number {
  return (unix % DAY) / 3600;
}

/** Own fields, including those a constructor leaves undefined. */
function topLevelKeys(value: object): string[] {
  return Object.keys(value).sort();
}

/** The fields of IBeanInformation; `satisfies` rejects a missing or unknown name. */
const BEAN_INFORMATION_FIELDS = Object.keys({
  country: true,
  region: true,
  farm: true,
  farmer: true,
  elevation: true,
  harvest_time: true,
  variety: true,
  processing: true,
  certification: true,
  percentage: true,
  purchasing_price: true,
  fob_price: true,
} satisfies Record<keyof IBeanInformation, true>).sort();

const DAY = 86_400;
const END = new Date('2026-11-01T18:00:00Z');

describe('synthetic data set', () => {
  let data: SyntheticDataSet;

  beforeAll(() => {
    data = generateDataSet({ brews: BREW_TIERS[0], endDate: END });
  });

  describe('matches the model classes', () => {
    it('brews have exactly the fields of a new Brew', () => {
      const expected = trackedFieldPaths(new Brew());
      for (const brew of data.BREWS.slice(0, 50)) {
        expect(fieldPaths(brew)).toEqual(expected);
      }
    });

    it('beans have exactly the fields of a new Bean', () => {
      const expected = trackedFieldPaths(new Bean());
      for (const bean of data.BEANS.slice(0, 50)) {
        // bean_information entries are records in an array; their fields are checked below.
        expect(fieldPaths(bean)).toEqual(expected);
      }
    });

    it('grinders, water and preparation tools have exactly the fields of their classes', () => {
      for (const mill of data.MILL) {
        expect(fieldPaths(mill)).toEqual(trackedFieldPaths(new Mill()));
      }
      for (const water of data.WATER) {
        expect(fieldPaths(water)).toEqual(trackedFieldPaths(new Water()));
      }
      for (const tool of data.PREPARATION.flatMap((p) => p.tools)) {
        expect(fieldPaths(tool)).toEqual(fieldPaths(new PreparationTool()));
      }
      expect(fieldPaths(data.VERSION[0])).toEqual(fieldPaths(new Version()));
    });

    it('preparations and settings only use existing fields and load with class defaults', () => {
      const preparationKeys = topLevelKeys(new Preparation());
      for (const entry of data.PREPARATION) {
        for (const key of topLevelKeys(entry)) {
          expect(preparationKeys).toContain(key);
        }
        const preparation = new Preparation();
        preparation.initializeByObject(entry as any);
        expect(preparation.manage_parameters).toEqual(
          new Preparation().manage_parameters,
        );
        // The stored style is the one the preparation form presets for the type.
        expect(preparation.getPresetStyleType()).toBe(entry.style_type as any);
      }

      const settingsKeys = topLevelKeys(new Settings());
      for (const key of topLevelKeys(data.SETTINGS[0])) {
        expect(settingsKeys).toContain(key);
      }
      const settings = new Settings();
      settings.initializeByObject(data.SETTINGS[0] as any);
      expect(settings.welcome_page_showed).toBeTrue();
      expect(settings.matomo_analytics).toBeFalse();
      expect(settings.brew_order).toEqual(new Settings().brew_order);
      // The stored profile is complete, so loading it changes nothing. It is the one an
      // installation from before the profile gets.
      expect(settings.user).toEqual(data.SETTINGS[0].user as any);
      const { user, ...beforeProfile } = data.SETTINGS[0];
      const existing = new Settings();
      existing.initializeByObject(beforeProfile as any);
      expect(existing.user).toEqual(user as any);
    });

    it('carries the change info the migration fills in for entries from before change tracking', () => {
      for (const collection of CHANGE_TRACKED_COLLECTIONS) {
        expect(Object.keys(data)).toContain(collection);
      }
      const collections: Record<string, { config: object }[]> = { ...data };
      const tracked = CHANGE_TRACKED_COLLECTIONS.flatMap(
        (collection) => collections[collection],
      ) as { config: Record<string, unknown> }[];
      expect(tracked.length).toBeGreaterThan(data.BREWS.length);
      // Nothing is missing: the migration and an import would leave every entry as it is.
      expect(fillMissingChangeInfo(structuredClone(tracked))).toBe(0);
      // And the values are the ones the migration computes from an entry without change info.
      const before = tracked.map((entry) => ({
        config: {
          uuid: entry.config.uuid,
          unix_timestamp: entry.config.unix_timestamp,
        },
      }));
      expect(fillMissingChangeInfo(before)).toBe(tracked.length);
      expect(before.map((entry) => entry.config)).toEqual(
        tracked.map((entry) => entry.config) as any,
      );
      for (const entry of tracked.slice(0, 50)) {
        expect(entry.config.created_at).toBe(
          (entry.config.unix_timestamp as number) * 1000,
        );
      }

      // Settings, the version entry and preparation tools have no change info.
      for (const entry of [
        ...data.SETTINGS,
        ...data.VERSION,
        ...data.PREPARATION.flatMap((p) => p.tools),
      ]) {
        expect(Object.keys(entry.config).sort()).toEqual([
          'unix_timestamp',
          'uuid',
        ]);
      }
    });

    it('has none of the keys that stay on one installation', () => {
      for (const key of LOCAL_ONLY_STORAGE_KEYS) {
        expect(Object.keys(data)).not.toContain(key);
      }
    });

    it('stores numbers and enum keys the way the app stores them', () => {
      for (const entry of data.BREWS) {
        const brew = new Brew();
        brew.initializeByObject(entry as any);
        expect(brew.fixDataTypes())
          .withContext('brew needs a type fix')
          .toBeFalse();
        expect(Object.keys(BREW_QUANTITY_TYPES_ENUM)).toContain(
          entry.brew_quantity_type,
        );
      }
      for (const entry of data.BEANS) {
        const bean = new Bean();
        bean.initializeByObject(entry as any);
        expect(bean.fixDataTypes())
          .withContext('bean needs a type fix')
          .toBeFalse();
        expect(Object.keys(ROASTS_ENUM)).toContain(entry.roast);
        expect(Object.keys(BEAN_MIX_ENUM)).toContain(entry.beanMix);
        expect(Object.keys(BEAN_ROASTING_TYPE_ENUM)).toContain(
          entry.bean_roasting_type,
        );
        // Typed as the app's interface, so a field of another type does not compile.
        const information: IBeanInformation[] = entry.bean_information;
        for (const record of information) {
          expect(Object.keys(record).sort()).toEqual(BEAN_INFORMATION_FIELDS);
        }
      }
      for (const preparation of data.PREPARATION) {
        expect(Object.values<string>(PREPARATION_TYPES)).toContain(
          preparation.type,
        );
      }
      for (const water of data.WATER) {
        expect(Object.keys(WATER_TYPES)).toContain(water.type);
        expect(Object.keys(WATER_UNIT)).toContain(water.general_hardness_type);
        expect(Object.keys(WATER_UNIT_TDS)).toContain(water.tds_type);
      }
    });
  });

  describe('app start', () => {
    it('lists exactly the data migrations the app runs, all as applied', async () => {
      const { update, version, saveVersion, runChangeInfoMigration } =
        startUpCheck(data.VERSION[0]);
      const checked = spyOn(
        version,
        'checkIfDataVersionWasUpdated',
      ).and.callThrough();

      await update.checkUpdate();

      const runByTheApp = [...new Set(checked.calls.allArgs().flat())];
      expect(runByTheApp.length).toBeGreaterThan(0);
      expect(
        runByTheApp.filter((name) => !APPLIED_DATA_VERSIONS.includes(name)),
      )
        .withContext('migrations missing in APPLIED_DATA_VERSIONS')
        .toEqual([]);
      expect(
        APPLIED_DATA_VERSIONS.filter((name) => !runByTheApp.includes(name)),
      )
        .withContext('APPLIED_DATA_VERSIONS the app does not run')
        .toEqual([]);
      const pending = checked.calls
        .all()
        .filter((call) => call.returnValue === false)
        .map((call) => call.args[0]);
      expect([...new Set(pending)])
        .withContext('migrations that would run')
        .toEqual([]);
      expect(saveVersion).not.toHaveBeenCalled();
      expect(runChangeInfoMigration).not.toHaveBeenCalled();
    });

    it('shows no update screen', async () => {
      const { update, openModal } = startUpCheck(data.VERSION[0]);

      await update.checkUpdateScreen();

      expect(openModal).not.toHaveBeenCalled();
    });
  });

  describe('references', () => {
    it('every brew points to an existing bean, grinder, preparation, tool and water', () => {
      const uuids = (list: { config: { uuid: string } }[]) =>
        new Set(list.map((e) => e.config.uuid));
      const beans = uuids(data.BEANS);
      const mills = uuids(data.MILL);
      const waters = uuids(data.WATER);
      const preparations = new Map(
        data.PREPARATION.map((p) => [p.config.uuid, p]),
      );
      for (const brew of data.BREWS) {
        expect(beans.has(brew.bean)).toBeTrue();
        expect(mills.has(brew.mill)).toBeTrue();
        expect(brew.water === '' || waters.has(brew.water)).toBeTrue();
        const preparation = preparations.get(brew.method_of_preparation);
        expect(preparation).toBeDefined();
        const tools = new Set(preparation.tools.map((t) => t.config.uuid));
        for (const tool of brew.method_of_preparation_tools) {
          expect(tools.has(tool)).toBeTrue();
        }
      }
    });

    it('about 70 % of the brews with a preparation that has tools use one of them', () => {
      const withTools = new Map(
        data.PREPARATION.filter((p) => p.tools.length > 0).map((p) => [
          p.config.uuid,
          p,
        ]),
      );
      expect(withTools.size).toBeGreaterThan(0);
      const used = new Set<string>();
      let possible = 0;
      let withTool = 0;
      for (const brew of data.BREWS) {
        expect(brew.method_of_preparation_tools.length).toBeLessThanOrEqual(1);
        if (!withTools.has(brew.method_of_preparation)) {
          expect(brew.method_of_preparation_tools).toEqual([]);
          continue;
        }
        possible++;
        if (brew.method_of_preparation_tools.length > 0) {
          withTool++;
          used.add(brew.method_of_preparation_tools[0]);
        }
      }
      expect(withTool / possible).toBeGreaterThan(0.6);
      expect(withTool / possible).toBeLessThan(0.8);
      // Every tool is in use.
      expect([...used].sort()).toEqual(
        [...withTools.values()]
          .flatMap((p) => p.tools.map((t) => t.config.uuid))
          .sort(),
      );
    });

    it('brews use beans that were already bought', () => {
      const bought = new Map(
        data.BEANS.map((b) => [b.config.uuid, b.config.unix_timestamp]),
      );
      for (const brew of data.BREWS) {
        expect(brew.config.unix_timestamp).toBeGreaterThanOrEqual(
          bought.get(brew.bean),
        );
      }
    });

    it('brews use beans only until they are used up, 10 to 40 days after the purchase', () => {
      // The largest tier: with 15 brews per bean on average, the last brew of a bean is close to
      // the day it was used up.
      const largest = generateDataSet({
        brews: BREW_TIERS[BREW_TIERS.length - 1],
        endDate: END,
      });
      const bought = new Map(
        largest.BEANS.map((b) => [b.config.uuid, b.config.unix_timestamp]),
      );
      // Days from the purchase of each bean until its last brew.
      const inUse = new Map<string, number>();
      let tooLate = 0;
      for (const brew of largest.BREWS) {
        const age = (brew.config.unix_timestamp - bought.get(brew.bean)) / DAY;
        if (age > 40) {
          tooLate++;
        }
        inUse.set(brew.bean, Math.max(inUse.get(brew.bean) ?? 0, age));
      }
      expect(tooLate)
        .withContext('brews more than 40 days after the purchase of the bean')
        .toBe(0);
      // Used up evenly between 10 and 40 days, so half of the beans within about 25 days. Beans
      // that stayed in use for the whole 40 days would move the median close to 40.
      const sorted = [...inUse.values()].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      expect(median).toBeGreaterThan(15);
      expect(median).toBeLessThan(30);
    });

    it('archives beans only once they are used up, at least a week before the end', () => {
      const end = END.getTime() / 1000;
      for (const brews of BREW_TIERS) {
        const tier = generateDataSet({ brews, endDate: END });
        const archived = new Set(
          tier.BEANS.filter((b) => b.finished).map((b) => b.config.uuid),
        );
        // A bean lasts at least 10 days and is archived a week after it was used up at the
        // earliest, so the newest beans are all current.
        const boughtLate = tier.BEANS.filter(
          (b) => b.config.unix_timestamp > end - 17 * DAY,
        );
        expect(boughtLate.length).toBeGreaterThan(5);
        expect(boughtLate.filter((b) => b.finished).length)
          .withContext(`archived beans bought in the last 17 days, ${brews}`)
          .toBe(0);
        const lastWeek = tier.BREWS.filter(
          (b) => b.config.unix_timestamp > end - 7 * DAY,
        );
        expect(lastWeek.length).toBeGreaterThan(0);
        expect(lastWeek.filter((b) => archived.has(b.bean)).length)
          .withContext(`brews of the last week with an archived bean, ${brews}`)
          .toBe(0);
      }
    });

    it('archives the requested share of the used-up beans', () => {
      const share = (archivedBeanShare: number) =>
        generateDataSet({
          brews: 0,
          endDate: END,
          archivedBeanShare,
        }).BEANS.filter((b) => b.finished).length / 1_000;
      expect(share(0)).toBe(0);
      expect(share(0.8)).toBeGreaterThan(0.7);
      expect(share(0.8)).toBeLessThan(0.85);
      // All but the beans of the last weeks, which are not used up yet.
      expect(share(1)).toBeGreaterThan(0.95);
      expect(share(1)).toBeLessThan(1);
    });

    it('roasts beans 2 to 12 days before they are bought', () => {
      const days = data.BEANS.map(
        (bean) =>
          (Date.parse(bean.buyDate) - Date.parse(bean.roastingDate)) /
          (DAY * 1000),
      );
      expect(Math.min(...days)).toBe(2);
      expect(Math.max(...days)).toBe(12);
      for (const bean of data.BEANS) {
        expect(Date.parse(bean.buyDate)).toBe(
          bean.config.unix_timestamp * 1000,
        );
      }
    });

    it('brews espresso with espresso or omni roasts and filter coffee with filter or omni roasts', () => {
      const style = new Map(
        data.PREPARATION.map((p) => [p.config.uuid, p.style_type]),
      );
      const roast = new Map(
        data.BEANS.map((b) => [b.config.uuid, b.bean_roasting_type]),
      );
      // Only in the first days, while few beans are open, can a brew get a bean roasted for the
      // other kind (the generator then takes any open bean).
      const afterStart = END.getTime() / 1000 - 5 * 365 * DAY + 14 * DAY;
      const otherRoast = data.BREWS.filter((brew) => {
        const other =
          style.get(brew.method_of_preparation) === 'ESPRESSO'
            ? 'FILTER'
            : 'ESPRESSO';
        return (
          brew.config.unix_timestamp >= afterStart &&
          roast.get(brew.bean) === other
        );
      });
      expect(otherRoast.length)
        .withContext('brews after the first two weeks with the other roast')
        .toBe(0);
    });

    it('brews use grinders, preparations, tools and water only after they were added', () => {
      const added = new Map(
        [
          ...data.MILL,
          ...data.PREPARATION,
          ...data.PREPARATION.flatMap((p) => p.tools),
          ...data.WATER,
        ].map((e) => [e.config.uuid, e]),
      );
      const tooEarly: Record<string, number> = {};
      for (const brew of data.BREWS) {
        for (const uuid of [
          brew.mill,
          brew.method_of_preparation,
          ...brew.method_of_preparation_tools,
          brew.water,
        ]) {
          const entry = added.get(uuid);
          if (
            entry &&
            entry.config.unix_timestamp > brew.config.unix_timestamp
          ) {
            tooEarly[entry.name] = (tooEarly[entry.name] ?? 0) + 1;
          }
        }
      }
      expect(tooEarly)
        .withContext('brews before the entry was added, per entry')
        .toEqual({});
    });

    it('brews of the last year use no archived grinder, preparation or water', () => {
      // Archived ones were in use earlier and replaced years before the end of the data.
      const archived = new Map(
        [...data.MILL, ...data.PREPARATION, ...data.WATER]
          .filter((e) => e.finished)
          .map((e) => [e.config.uuid, e.name]),
      );
      const lastYear = END.getTime() / 1000 - 365 * DAY;
      const used = new Set<string>();
      const late: Record<string, number> = {};
      for (const brew of data.BREWS) {
        for (const uuid of [
          brew.mill,
          brew.method_of_preparation,
          brew.water,
        ]) {
          const name = archived.get(uuid);
          if (name === undefined) {
            continue;
          }
          used.add(name);
          if (brew.config.unix_timestamp > lastYear) {
            late[name] = (late[name] ?? 0) + 1;
          }
        }
      }
      expect([...used].sort())
        .withContext('archived entries that brews use')
        .toEqual([...archived.values()].sort());
      expect(late)
        .withContext('brews of the last year, per archived entry')
        .toEqual({});
    });

    it('counts a brew as current when bean, grinder and preparation are all current', () => {
      // The rule of the brew list's "Current" segment (BrewPage.__initializeBrewView()).
      const archived = (
        list: { config: { uuid: string }; finished: boolean }[],
        uuid: string,
      ) => list.find((e) => e.config.uuid === uuid).finished;
      const wrong: string[] = [];
      const onlyReasons = new Set<string>();
      for (const brew of data.BREWS) {
        const archivedParts = Object.entries({
          bean: archived(data.BEANS, brew.bean),
          grinder: archived(data.MILL, brew.mill),
          preparation: archived(data.PREPARATION, brew.method_of_preparation),
        })
          .filter(([, isArchived]) => isArchived)
          .map(([part]) => part);
        if (isOpenBrew(data, brew) !== (archivedParts.length === 0)) {
          wrong.push(brew.config.uuid);
        }
        if (archivedParts.length <= 1) {
          onlyReasons.add(archivedParts[0] ?? 'none');
        }
      }
      expect(wrong).withContext('brews isOpenBrew() gets wrong').toEqual([]);
      // Each part archives some brews on its own, so the comparison covers every condition.
      expect([...onlyReasons].sort()).toEqual([
        'bean',
        'grinder',
        'none',
        'preparation',
      ]);
    });

    it('uuids are unique across all entries', () => {
      const all = [
        ...data.BREWS,
        ...data.BEANS,
        ...data.MILL,
        ...data.WATER,
        ...data.PREPARATION,
        ...data.PREPARATION.flatMap((p) => p.tools),
      ].map((e) => e.config.uuid);
      expect(new Set(all).size).toBe(all.length);
      for (const uuid of all) {
        expect(uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
      }
    });
  });

  describe('amounts and distribution', () => {
    it('creates the requested number of brews and beans for every tier', () => {
      for (const brews of BREW_TIERS) {
        const tier = generateDataSet({ brews, endDate: END });
        expect(tier.BREWS.length).toBe(brews);
        expect(tier.BEANS.length).toBe(1_000);
        // Stored oldest first, and no two brews share a second.
        const times = tier.BREWS.map((b) => b.config.unix_timestamp);
        expect(times.filter((time, i) => i > 0 && time <= times[i - 1]))
          .withContext(`brews not later than the brew before, ${brews}`)
          .toEqual([]);
      }
      const small = generateDataSet({ brews: 0, beans: 3, endDate: END });
      expect(small.BREWS).toEqual([]);
      expect(small.BEANS.length).toBe(3);
    });

    it('spreads brews over five years in chronological storage order', () => {
      const times = data.BREWS.map((b) => b.config.unix_timestamp);
      const end = END.getTime() / 1000;
      const start = end - 5 * 365 * DAY;
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1]);
      }
      expect(times[0]).toBeGreaterThanOrEqual(start);
      expect(times[0]).toBeLessThan(start + 30 * DAY);
      expect(times[times.length - 1]).toBeLessThanOrEqual(end);
      expect(times[times.length - 1]).toBeGreaterThan(end - 3 * DAY);

      const perYear = [0, 0, 0, 0, 0];
      for (const time of times) {
        perYear[Math.min(4, Math.floor((time - start) / (365 * DAY)))]++;
      }
      expect(perYear.every((count) => count > 0)).toBeTrue();
    });

    it('ends at the given end date and covers the given number of years', () => {
      const end = new Date('2025-03-15T07:30:00Z');
      const endUnix = end.getTime() / 1000;
      const moved = generateDataSet({ brews: BREW_TIERS[0], endDate: end });
      const times = moved.BREWS.map((b) => b.config.unix_timestamp);
      expect(times[times.length - 1]).toBeLessThanOrEqual(endUnix);
      expect(times[times.length - 1]).toBeGreaterThan(endUnix - 3 * DAY);
      expect(times[0]).toBeGreaterThanOrEqual(endUnix - 5 * 365 * DAY);
      expect(times[0]).toBeLessThan(endUnix - 5 * 365 * DAY + 30 * DAY);
      for (const bean of moved.BEANS) {
        expect(bean.config.unix_timestamp).toBeLessThanOrEqual(endUnix);
      }

      const short = generateDataSet({
        brews: BREW_TIERS[0],
        endDate: end,
        years: 2,
      }).BREWS.map((b) => b.config.unix_timestamp);
      expect(short[short.length - 1]).toBeLessThanOrEqual(endUnix);
      expect(short[0]).toBeGreaterThanOrEqual(endUnix - 2 * 365 * DAY);
      expect(short[0]).toBeLessThan(endUnix - 2 * 365 * DAY + 30 * DAY);

      // Without an end date the data ends at the documented default.
      expect(JSON.stringify(generateDataSet({ brews: 10 }))).toBe(
        JSON.stringify(
          generateDataSet({
            brews: 10,
            endDate: new Date('2026-11-01T18:00:00Z'),
          }),
        ),
      );
      expect(JSON.stringify(generateDataSet({ brews: 10 }))).not.toBe(
        JSON.stringify(generateDataSet({ brews: 10, endDate: end })),
      );
    });

    it('brews in the morning, after lunch and in the late afternoon', () => {
      const hours = generateDataSet({
        brews: BREW_TIERS[BREW_TIERS.length - 1],
        endDate: END,
      }).BREWS.map((b) => hourOfDay(b.config.unix_timestamp));
      const between = (from: number, until: number) =>
        hours.filter((hour) => hour >= from && hour < until).length;
      expect(Math.min(...hours)).toBeGreaterThanOrEqual(5);
      expect(Math.max(...hours)).toBeLessThanOrEqual(23.5);
      // More than half of the brews are in the morning; evenly spread over the day it would
      // be a fifth.
      expect(between(6, 10) / hours.length).toBeGreaterThan(0.45);
      // Each of the later two peaks stands out against the quiet hours next to it.
      expect(between(12.5, 14.5)).toBeGreaterThan(3 * between(10, 11));
      expect(between(16, 18)).toBeGreaterThan(3 * between(19.5, 21.5));
    });

    it('has the documented equipment', () => {
      const names = (list: { name: string; finished: boolean }[]) => ({
        current: list.filter((e) => !e.finished).map((e) => e.name),
        archived: list.filter((e) => e.finished).map((e) => e.name),
      });
      expect(names(data.PREPARATION)).toEqual({
        current: [
          'Espresso machine',
          'V60',
          'AeroPress',
          'Chemex',
          'French press',
        ],
        archived: ['Moka pot', 'Kalita Wave'],
      });
      expect(names(data.MILL)).toEqual({
        current: [
          'Flat burr grinder',
          'Conical hand grinder',
          'Single dose grinder',
        ],
        archived: ['Entry burr grinder'],
      });
      expect(names(data.WATER)).toEqual({
        current: ['Filtered water', 'Light roast recipe'],
        archived: ['Tap water'],
      });
      // Every preparation, grinder and water is used by brews.
      for (const [list, field] of [
        [data.PREPARATION, 'method_of_preparation'],
        [data.MILL, 'mill'],
        [data.WATER, 'water'],
      ] as const) {
        const used = new Set(data.BREWS.map((brew) => brew[field]));
        for (const entry of list) {
          expect(used.has(entry.config.uuid))
            .withContext(`${entry.name} is used`)
            .toBeTrue();
        }
      }
    });

    it('brews more often every year', () => {
      // The largest tier, so random spread cannot reorder the years.
      const times = generateDataSet({
        brews: BREW_TIERS[BREW_TIERS.length - 1],
        endDate: END,
      }).BREWS.map((b) => b.config.unix_timestamp);
      const start = END.getTime() / 1000 - 5 * 365 * DAY;
      const perYear = [0, 0, 0, 0, 0];
      for (const time of times) {
        perYear[Math.min(4, Math.floor((time - start) / (365 * DAY)))]++;
      }
      for (let year = 1; year < perYear.length; year++) {
        expect(perYear[year])
          .withContext(`brews in year ${year + 1}`)
          .toBeGreaterThan(perYear[year - 1]);
      }
      // Brews per day rise linearly to twice the first day's number, so the last of the five
      // years has 0.38 / 0.22 = 1.73 times the brews of the first.
      expect(perYear[4] / perYear[0]).toBeGreaterThan(1.55);
      expect(perYear[4] / perYear[0]).toBeLessThan(1.9);
    });

    it('mixes espresso and filter, archived and current, blends and ratings', () => {
      const style = (uuid: string) =>
        data.PREPARATION.find((p) => p.config.uuid === uuid).style_type;
      const espresso = data.BREWS.filter(
        (b) => style(b.method_of_preparation) === 'ESPRESSO',
      ).length;
      expect(espresso / data.BREWS.length).toBeGreaterThan(0.4);
      expect(espresso / data.BREWS.length).toBeLessThan(0.65);

      const archived = data.BEANS.filter((b) => b.finished).length;
      expect(archived / data.BEANS.length).toBeGreaterThan(0.3);
      expect(archived / data.BEANS.length).toBeLessThan(0.5);
      expect(data.PREPARATION.some((p) => p.finished)).toBeTrue();
      expect(data.MILL.some((m) => m.finished)).toBeTrue();

      const open = data.BREWS.filter((b) => isOpenBrew(data, b)).length;
      expect(open).toBeGreaterThan(0);
      expect(open).toBeLessThan(data.BREWS.length);

      const blends = data.BEANS.filter((b) => b.beanMix === 'BLEND');
      // A quarter of the beans.
      expect(blends.length / data.BEANS.length).toBeGreaterThan(0.2);
      expect(blends.length / data.BEANS.length).toBeLessThan(0.3);
      for (const blend of blends) {
        expect(blend.bean_information.length).toBeGreaterThan(1);
        const total = blend.bean_information.reduce(
          (sum, i) => sum + i.percentage,
          0,
        );
        expect(total).toBe(100);
      }

      const ratings = new Set(data.BREWS.map((b) => b.rating));
      expect([...ratings].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(data.BREWS.filter((b) => b.note !== '').length).toBeGreaterThan(
        data.BREWS.length * 0.2,
      );
    });

    it('uses the search term only in brew notes', () => {
      const term = NOTE_SEARCH_TERM;
      expect(
        data.BREWS.some((b) => b.note.toLowerCase().includes(term)),
      ).toBeTrue();
      const elsewhere = [
        ...data.BEANS.flatMap((b) => [
          b.name,
          b.roaster,
          ...b.bean_information.flatMap((i) => Object.values(i).map(String)),
        ]),
        ...data.PREPARATION.map((p) => p.name),
      ];
      expect(
        elsewhere.some((text) => text.toLowerCase().includes(term)),
      ).toBeFalse();
    });

    it('adds photo and flow profile references only on request', () => {
      expect(data.BREWS.some((b) => b.attachments.length > 0)).toBeFalse();
      expect(data.BREWS.some((b) => b.flow_profile !== '')).toBeFalse();

      const withFiles = generateDataSet({
        brews: 2_000,
        endDate: END,
        fileReferences: true,
      });
      const flowProfiles = withFiles.BREWS.filter((b) => b.flow_profile !== '');
      expect(flowProfiles.length).toBeGreaterThan(0);
      for (const brew of flowProfiles) {
        expect(brew.flow_profile).toBe(
          `brews/${brew.config.uuid}_flow_profile.json`,
        );
      }
      for (const entries of [withFiles.BEANS, withFiles.BREWS]) {
        const photos = entries.flatMap(
          (entry: { attachments: string[] }) => entry.attachments,
        );
        expect(photos.length).toBeGreaterThan(0);
        expect(photos.length).toBeLessThan(entries.length / 2);
        for (const photo of photos) {
          expect(photo).toMatch(/^photo_.+\.jpg$/);
        }
      }
      expect(data.BEANS.some((b) => b.attachments.length > 0)).toBeFalse();
    });
  });

  describe('seed', () => {
    it('produces the same data for the same options', () => {
      const again = generateDataSet({ brews: BREW_TIERS[0], endDate: END });
      expect(JSON.stringify(again)).toBe(JSON.stringify(data));
      expect(JSON.stringify(generateDataSet({ brews: 10 }))).toBe(
        JSON.stringify(generateDataSet({ brews: 10, seed: 1 })),
      );
    });

    it('produces different data for another seed', () => {
      const other = generateDataSet({
        brews: BREW_TIERS[0],
        endDate: END,
        seed: 2,
      });
      expect(other.BREWS[0].config.uuid).not.toBe(data.BREWS[0].config.uuid);
      expect(other.BREWS.map((b) => b.note)).not.toEqual(
        data.BREWS.map((b) => b.note),
      );
    });

    it('rejects invalid amounts', () => {
      expect(() => generateDataSet({ brews: -1 })).toThrowError(/brews/);
      expect(() => generateDataSet({ brews: 1.5 })).toThrowError(/brews/);
      expect(() => generateDataSet({ brews: 1, beans: 0 })).toThrowError(
        /beans/,
      );
    });
  });
});
