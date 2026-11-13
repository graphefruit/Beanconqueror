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
        useValue: { hasData: () => Promise.resolve(true) },
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
  return { update: TestBed.inject(UIUpdate), version, saveVersion, openModal };
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

/** Own fields, including those a constructor leaves undefined. */
function topLevelKeys(value: object): string[] {
  return Object.keys(value).sort();
}

const DAY = 86_400;
const END = new Date('2026-11-01T18:00:00Z');

describe('synthetic data set', () => {
  let data: SyntheticDataSet;

  beforeAll(() => {
    data = generateDataSet({ brews: BREW_TIERS[0], endDate: END });
  });

  describe('matches the model classes', () => {
    it('brews have exactly the fields of a new Brew', () => {
      const expected = fieldPaths(new Brew());
      for (const brew of data.BREWS.slice(0, 50)) {
        expect(fieldPaths(brew)).toEqual(expected);
      }
    });

    it('beans have exactly the fields of a new Bean', () => {
      const expected = fieldPaths(new Bean());
      for (const bean of data.BEANS.slice(0, 50)) {
        // bean_information entries are records in an array; their fields are checked below.
        expect(fieldPaths(bean)).toEqual(expected);
      }
    });

    it('grinders, water and preparation tools have exactly the fields of their classes', () => {
      for (const mill of data.MILL) {
        expect(fieldPaths(mill)).toEqual(fieldPaths(new Mill()));
      }
      for (const water of data.WATER) {
        expect(fieldPaths(water)).toEqual(fieldPaths(new Water()));
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
        for (const information of entry.bean_information) {
          // The bean form creates these records with all fields of IBeanInformation.
          expect(Object.keys(information).length).toBe(12);
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
      const { update, version, saveVersion } = startUpCheck(data.VERSION[0]);
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
      // Brewing gets more frequent over the years.
      expect(perYear[4]).toBeGreaterThan(perYear[0]);
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
      expect(blends.length).toBeGreaterThan(0);
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
      expect(
        withFiles.BEANS.some((b) =>
          /^photo_.+\.jpg$/.test(b.attachments[0] ?? ''),
        ),
      ).toBeTrue();
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
