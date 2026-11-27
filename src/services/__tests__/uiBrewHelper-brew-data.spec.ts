import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { BrewAddComponent } from '../../app/brew/brew-add/brew-add.component';
import { BrewEditComponent } from '../../app/brew/brew-edit/brew-edit.component';
import { BrewRatingComponent } from '../../app/brew/brew-rating/brew-rating.component';
import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { ManageBrewParameter } from '../../classes/parameter/manageBrewParameter';
import { Preparation } from '../../classes/preparation/preparation';
import { PreparationTool } from '../../classes/preparation/preparationTool';
import { PreparationDeviceType } from '../../classes/preparationDevice';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { CoffeeBluetoothDevicesService } from '../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIBeanHelper } from '../uiBeanHelper';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewHelper } from '../uiBrewHelper';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIHelper } from '../uiHelper';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIToast } from '../uiToast';

interface IEntry {
  config: { uuid: string };
}

/** A collection in memory; like the real one it returns nothing for an unknown uuid. */
class FakeStorage<T extends IEntry> {
  public entries: T[] = [];
  private readonly events = new Subject<void>();

  public attachOnEvent() {
    return this.events.asObservable();
  }

  public getAllEntries(): T[] {
    return this.entries;
  }

  public getByUUID(uuid: string): T | undefined {
    return this.entries.find((entry) => entry.config.uuid === uuid);
  }

  /** A change the storage announces. */
  public change(entries: T[]): void {
    this.entries = entries;
    this.events.next();
  }
}

interface IModalOptions {
  component: unknown;
  componentProps?: Record<string, unknown>;
}

/** Every modal closes right after it was presented. */
class ClosingModalController {
  public readonly opened: IModalOptions[] = [];
  public dismissData: unknown;
  /** What happens while the modal is open, e.g. the user saving in it. */
  public whileOpen: () => void = () => undefined;

  public create(options: IModalOptions) {
    this.opened.push(options);
    return Promise.resolve({
      present: () => Promise.resolve(),
      onWillDismiss: () => {
        this.whileOpen();
        return Promise.resolve({ data: this.dismissData });
      },
    });
  }
}

function allParameters(active: boolean): ManageBrewParameter {
  const parameters = new ManageBrewParameter();
  for (const key of Object.keys(parameters)) {
    parameters[key] = active;
  }
  return parameters;
}

function onlyParameter(name: string): ManageBrewParameter {
  const parameters = allParameters(false);
  parameters[name] = true;
  return parameters;
}

function withUuid<T extends IEntry>(entry: T, uuid: string): T {
  entry.config.uuid = uuid;
  return entry;
}

function tool(uuid: string, archived: boolean): PreparationTool {
  const entry = withUuid(new PreparationTool(), uuid);
  entry.archived = archived;
  return entry;
}

/** A brew with a value in every field a user can fill. */
function recordedBrew(): Brew {
  const brew = new Brew();
  Object.assign(brew, {
    bean: 'bean-1',
    mill: 'mill-1',
    method_of_preparation: 'preparation-1',
    grind_size: '12',
    grind_weight: 18,
    mill_timer: 21,
    mill_timer_milliseconds: 300,
    mill_speed: 900,
    pressure_profile: '9 bar',
    brew_temperature: 93,
    brew_temperature_time: 40,
    brew_temperature_time_milliseconds: 100,
    brew_time: 28,
    brew_time_milliseconds: 500,
    brew_quantity: 250,
    brew_quantity_type: BREW_QUANTITY_TYPES_ENUM.ML,
    coffee_type: 'Espresso',
    coffee_concentration: 'strong',
    coffee_first_drip_time: 6,
    coffee_first_drip_time_milliseconds: 200,
    coffee_blooming_time: 30,
    coffee_blooming_time_milliseconds: 700,
    rating: 4,
    note: 'fruity',
    tds: 9.5,
    brew_beverage_quantity: 36,
    brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM.ML,
    method_of_preparation_tools: ['tool-active'],
    water: 'water-1',
    bean_weight_in: 18.5,
    vessel_name: 'Cup',
    vessel_weight: 120,
    attachments: ['photo.jpg'],
    flow_profile: 'brews/flow.json',
    favourite: true,
    best_brew: true,
    preparationDeviceBrew: {
      type: PreparationDeviceType.XENIA,
      params: { scriptStartId: 2, nested: { value: 1 } },
    },
  });
  brew.config.uuid = 'brew-1';
  brew.config.unix_timestamp = 1700000000;
  brew.coordinates.latitude = 48.1;
  brew.coordinates.longitude = 11.5;
  brew.cupping.flavor = 8;
  brew.cupping.notes = 'clean';
  brew.cupped_flavor.custom_flavors = ['cherry'];
  brew.reference_flow_profile.uuid = 'brew-0';
  brew.customInformation.visualizer_id = 'visualizer-1';
  return brew;
}

/** The brew as the storage would write it. */
function stored(brew: Brew): Record<string, unknown> {
  return JSON.parse(JSON.stringify(brew)) as Record<string, unknown>;
}

describe('UIBrewHelper brew data', () => {
  let helper: UIBrewHelper;
  let settings: Settings;
  let beans: FakeStorage<Bean>;
  let mills: FakeStorage<Mill>;
  let preparations: FakeStorage<Preparation>;
  let brews: FakeStorage<Brew>;
  let settingsEvents: Subject<void>;
  let modalController: ClosingModalController;
  let presentCustomPopover: jasmine.Spy;
  let showConfirm: jasmine.Spy;
  let trackBulkEvents: jasmine.Spy;
  let connectedScale: { device_name: string } | null;
  let connectedPressureDevice: { device_name: string } | null;

  let bean: Bean;
  let mill: Mill;
  let preparation: Preparation;

  /** Resolves bean, mill and preparation of the brew without the app storages. */
  function link(brew: Brew): Brew {
    spyOn(brew, 'getBean').and.callFake(() => bean);
    spyOn(brew, 'getMill').and.callFake(() => mill);
    spyOn(brew, 'getPreparation').and.callFake(() => preparation);
    return brew;
  }

  beforeEach(() => {
    settings = new Settings();
    settings.manage_parameters = allParameters(true);
    settingsEvents = new Subject<void>();

    bean = withUuid(new Bean(), 'bean-1');
    bean.internal_share_code = 'BEAN01';
    mill = withUuid(new Mill(), 'mill-1');
    preparation = withUuid(new Preparation(), 'preparation-1');
    preparation.name = 'V60';
    preparation.tools = [
      tool('tool-active', false),
      tool('tool-archived', true),
    ];

    beans = new FakeStorage<Bean>();
    beans.entries = [bean];
    mills = new FakeStorage<Mill>();
    mills.entries = [mill];
    preparations = new FakeStorage<Preparation>();
    preparations.entries = [preparation];
    brews = new FakeStorage<Brew>();

    modalController = new ClosingModalController();
    presentCustomPopover = jasmine.createSpy('presentCustomPopover');
    showConfirm = jasmine.createSpy('showConfirm');
    trackBulkEvents = jasmine.createSpy('trackBulkEvents');
    connectedScale = null;
    connectedPressureDevice = null;

    TestBed.configureTestingModule({
      providers: [
        UIBrewHelper,
        { provide: ModalController, useValue: modalController },
        { provide: UIToast, useValue: { showInfoToast: () => undefined } },
        { provide: UIBeanStorage, useValue: beans },
        { provide: UIMillStorage, useValue: mills },
        { provide: UIPreparationStorage, useValue: preparations },
        { provide: UIBrewStorage, useValue: brews },
        {
          provide: UISettingsStorage,
          useValue: {
            attachOnEvent: () => settingsEvents.asObservable(),
            getSettings: () => settings,
          },
        },
        {
          provide: UIAlert,
          useValue: { presentCustomPopover, showConfirm },
        },
        { provide: UIAnalytics, useValue: { trackBulkEvents } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string) => key },
        },
        {
          provide: UIHelper,
          useValue: {
            cloneData: (value: unknown) => StorageClass.cloneData(value),
          },
        },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {
            getScale: () => connectedScale,
            getPressureDevice: () => connectedPressureDevice,
          },
        },
      ],
    });
    helper = TestBed.inject(UIBrewHelper);
  });

  describe('removing the values of hidden parameters before saving', () => {
    /** The fields each parameter owns, with the value that is left. */
    const clearedBy: Record<string, Record<string, unknown>> = {
      grind_size: { grind_size: '' },
      grind_weight: { grind_weight: 0 },
      mill_timer: { mill_timer: 0, mill_timer_milliseconds: 0 },
      mill_speed: { mill_speed: 0 },
      pressure_profile: { pressure_profile: '' },
      brew_temperature: { brew_temperature: 0 },
      brew_temperature_time: {
        brew_temperature_time: 0,
        brew_temperature_time_milliseconds: 0,
      },
      brew_time: { brew_time: 0, brew_time_milliseconds: 0 },
      brew_quantity: { brew_quantity: 0 },
      coffee_type: { coffee_type: '' },
      coffee_concentration: { coffee_concentration: '' },
      coffee_first_drip_time: {
        coffee_first_drip_time: 0,
        coffee_first_drip_time_milliseconds: 0,
      },
      coffee_blooming_time: {
        coffee_blooming_time: 0,
        coffee_blooming_time_milliseconds: 0,
      },
      rating: { rating: 0 },
      note: { note: '' },
      tds: { tds: 0 },
      brew_beverage_quantity: { brew_beverage_quantity: 0 },
      method_of_preparation_tool: { method_of_preparation_tools: [] },
      water: { water: '' },
      bean_weight_in: { bean_weight_in: 0 },
      vessel: { vessel_name: '', vessel_weight: 0 },
    };
    const everythingCleared = Object.assign({}, ...Object.values(clearedBy));

    it('leaves the brew as it is while every parameter is shown', () => {
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual(stored(recordedBrew()));
    });

    // Saving an edited brew runs the same cleaning, so a value recorded while
    // the parameter was shown is erased once the parameter is hidden.
    describe('known gap: erases what was recorded before a parameter was hidden', () => {
      for (const [parameter, cleared] of Object.entries(clearedBy)) {
        it(`${parameter} only empties ${Object.keys(cleared).join(', ')}`, () => {
          settings.manage_parameters[parameter] = false;
          const brew = link(recordedBrew());

          helper.cleanInvisibleBrewData(brew);

          expect(stored(brew)).toEqual({
            ...stored(recordedBrew()),
            ...cleared,
          });
        });
      }
    });

    it('empties nothing for the parameters that own no brew value', () => {
      const withoutValue = Object.keys(new ManageBrewParameter()).filter(
        (parameter) => !(parameter in clearedBy),
      );
      for (const parameter of withoutValue) {
        settings.manage_parameters[parameter] = false;
      }
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(withoutValue.sort()).toEqual([
        'attachments',
        'bean_type',
        'method_of_preparation',
        'mill',
        'set_custom_brew_time',
        'set_last_coffee_brew',
      ]);
      expect(stored(brew)).toEqual(stored(recordedBrew()));
    });

    it('keeps bean, mill, preparation, photos, graph, cupping and device data with every parameter hidden', () => {
      settings.manage_parameters = allParameters(false);
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      const original = stored(recordedBrew());
      expect(stored(brew)).toEqual({ ...original, ...everythingCleared });
      for (const kept of [
        'bean',
        'mill',
        'method_of_preparation',
        'attachments',
        'flow_profile',
        'reference_flow_profile',
        'cupping',
        'cupped_flavor',
        'config',
        'preparationDeviceBrew',
        'customInformation',
        'coordinates',
        'favourite',
        'best_brew',
        'brew_quantity_type',
        'brew_beverage_quantity_type',
      ]) {
        expect(stored(brew)[kept]).withContext(kept).toEqual(original[kept]);
      }
    });

    it('empties the grind time of a mill without a timer although the parameter is shown', () => {
      mill.has_timer = false;
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual({
        ...stored(recordedBrew()),
        ...clearedBy.mill_timer,
      });
    });

    it('empties the mill speed of a mill without adjustable speed although the parameter is shown', () => {
      mill.has_adjustable_speed = false;
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual({
        ...stored(recordedBrew()),
        ...clearedBy.mill_speed,
      });
    });

    it('follows the parameters of a preparation with custom parameters, not the settings', () => {
      preparation.use_custom_parameters = true;
      preparation.manage_parameters = allParameters(true);
      preparation.manage_parameters.rating = false;
      settings.manage_parameters = allParameters(false);
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual({ ...stored(recordedBrew()), rating: 0 });
    });

    it('follows the settings while the preparation has no custom parameters', () => {
      preparation.use_custom_parameters = false;
      preparation.manage_parameters = allParameters(false);
      settings.manage_parameters.note = false;
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual({ ...stored(recordedBrew()), note: '' });
    });

    it('reads the settings anew for every brew', () => {
      const replaced = new Settings();
      replaced.manage_parameters = allParameters(true);
      replaced.manage_parameters.tds = false;
      settings = replaced;
      const brew = link(recordedBrew());

      helper.cleanInvisibleBrewData(brew);

      expect(stored(brew)).toEqual({ ...stored(recordedBrew()), tds: 0 });
    });
  });

  describe('copying a brew to repeat it', () => {
    /** What a new brew starts with and a repeated brew must not inherit. */
    function notInherited(): Record<string, unknown> {
      const fresh = stored(new Brew());
      return {
        config: fresh.config,
        attachments: fresh.attachments,
        cupping: fresh.cupping,
        cupped_flavor: fresh.cupped_flavor,
        flow_profile: fresh.flow_profile,
        reference_flow_profile: fresh.reference_flow_profile,
        customInformation: fresh.customInformation,
        favourite: fresh.favourite,
        best_brew: fresh.best_brew,
        coordinates: fresh.coordinates,
      };
    }

    it('takes over every brew value and starts photos, cupping, graph, location and identity anew', () => {
      const source = link(recordedBrew());

      const repeat = helper.copyBrewToRepeat(source);

      expect(repeat).toBeInstanceOf(Brew);
      expect(stored(repeat)).toEqual({
        ...stored(recordedBrew()),
        ...notInherited(),
      });
      expect(repeat.flow_profile).toBe('');
      expect(repeat.config.uuid).toBe('');
      expect(repeat.attachments).toEqual([]);
      expect(repeat.coordinates).not.toBe(source.coordinates);
    });

    it('leaves the source brew as it was', () => {
      const source = link(recordedBrew());

      helper.copyBrewToRepeat(source);

      expect(stored(source)).toEqual(stored(recordedBrew()));
    });

    it('leaves out an archived bean', () => {
      bean.finished = true;

      const repeat = helper.copyBrewToRepeat(link(recordedBrew()));

      expect(repeat.bean).toBe('');
      expect(repeat.mill).toBe('mill-1');
      expect(repeat.method_of_preparation).toBe('preparation-1');
    });

    it('leaves out an archived mill but keeps its grind time and speed', () => {
      mill.finished = true;

      const repeat = helper.copyBrewToRepeat(link(recordedBrew()));

      expect(repeat.mill).toBe('');
      expect(repeat.bean).toBe('bean-1');
      expect(repeat.mill_timer).toBe(21);
      expect(repeat.mill_speed).toBe(900);
    });

    it('leaves out an archived preparation but keeps its active tools', () => {
      preparation.finished = true;

      const repeat = helper.copyBrewToRepeat(link(recordedBrew()));

      expect(repeat.method_of_preparation).toBe('');
      expect(repeat.method_of_preparation_tools).toEqual(['tool-active']);
    });

    it('leaves out an archived tool and keeps the active one', () => {
      const source = link(recordedBrew());
      source.method_of_preparation_tools = ['tool-archived', 'tool-active'];

      const repeat = helper.copyBrewToRepeat(source);

      expect(repeat.method_of_preparation_tools).toEqual(['tool-active']);
      expect(source.method_of_preparation_tools).toEqual([
        'tool-archived',
        'tool-active',
      ]);
    });

    it('copies the machine data of a connected machine without sharing it', () => {
      const source = link(recordedBrew());

      const repeat = helper.copyBrewToRepeat(source);
      repeat.preparationDeviceBrew.params.nested.value = 99;

      expect(repeat.preparationDeviceBrew).not.toBe(
        source.preparationDeviceBrew,
      );
      expect(source.preparationDeviceBrew.params.nested.value).toBe(1);
    });

    it('does not copy machine data of a brew without a machine', () => {
      const source = link(recordedBrew());
      source.preparationDeviceBrew = {
        type: PreparationDeviceType.NONE,
        params: { leftover: true },
      };

      const repeat = helper.copyBrewToRepeat(source);

      expect(repeat.preparationDeviceBrew.type).toBe(
        PreparationDeviceType.NONE,
      );
      expect(repeat.preparationDeviceBrew.params).toBeUndefined();
    });

    it('copies a brew that was stored without machine data', () => {
      const source = link(recordedBrew());
      source.preparationDeviceBrew = undefined;

      const repeat = helper.copyBrewToRepeat(source);

      expect(repeat.preparationDeviceBrew.type).toBe(
        PreparationDeviceType.NONE,
      );
    });

    it('does not copy a brew whose bean was deleted', () => {
      beans.entries = [];

      expect(helper.copyBrewToRepeat(link(recordedBrew()))).toBeUndefined();
    });

    it('does not copy a brew whose preparation was deleted', () => {
      preparations.entries = [];

      expect(helper.copyBrewToRepeat(link(recordedBrew()))).toBeUndefined();
    });

    it('does not copy a brew whose mill was deleted', () => {
      mills.entries = [];

      expect(helper.copyBrewToRepeat(link(recordedBrew()))).toBeUndefined();
    });

    it('leaves out a tool that was removed from the preparation', () => {
      const source = link(recordedBrew());
      source.method_of_preparation_tools = ['tool-removed', 'tool-active'];

      const repeat = helper.copyBrewToRepeat(source);

      expect(repeat.method_of_preparation_tools).toEqual(['tool-active']);
    });

    it('takes over a tool that was stored without the archived flag', () => {
      delete preparation.tools[0].archived;

      const repeat = helper.copyBrewToRepeat(link(recordedBrew()));

      expect(repeat.method_of_preparation_tools).toEqual(['tool-active']);
    });
  });

  describe('noticing an emptied bean package', () => {
    function brewOf(beanUuid: string, dose: number, groundWeight = 0): Brew {
      const brew = new Brew();
      brew.bean = beanUuid;
      brew.bean_weight_in = dose;
      brew.grind_weight = groundWeight;
      brew.getBean = () => withUuid(new Bean(), beanUuid);
      return brew;
    }

    function consumed(weight: number): boolean {
      bean.weight = weight;
      return helper.checkIfBeanPackageIsConsumed(bean);
    }

    it('never asks for a bean without a package weight', () => {
      brews.entries = [brewOf('bean-1', 500)];

      expect(consumed(0)).toBeFalse();
    });

    it('starts at exactly five grams left', () => {
      brews.entries = [brewOf('bean-1', 18)];

      expect(consumed(23.01)).toBeFalse();
      expect(consumed(23)).toBeTrue();
      expect(consumed(22.99)).toBeTrue();
    });

    it('counts a package that was used beyond its weight as consumed', () => {
      brews.entries = [brewOf('bean-1', 18), brewOf('bean-1', 18)];

      expect(consumed(20)).toBeTrue();
    });

    it('counts a small package as consumed before its first brew', () => {
      expect(consumed(5)).toBeTrue();
      expect(consumed(5.01)).toBeFalse();
    });

    it('only counts the brews of this bean', () => {
      brews.entries = [brewOf('bean-1', 18), brewOf('bean-2', 200)];

      // 200 g of the other bean would leave less than five grams of these.
      expect(consumed(220)).toBeFalse();
      expect(consumed(23.01)).toBeFalse();
      expect(consumed(23)).toBeTrue();
    });

    it('counts the dose of a brew, and the ground weight only without a dose', () => {
      // 18 (dose wins over 30 ground) + 17 (ground, no dose) = 35
      brews.entries = [brewOf('bean-1', 18, 30), brewOf('bean-1', 0, 17)];

      expect(consumed(40.01)).toBeFalse();
      expect(consumed(40)).toBeTrue();
    });

    describe('and offering to archive it', () => {
      let archiveBeanWithRatingQuestion: jasmine.Spy;

      beforeEach(() => {
        archiveBeanWithRatingQuestion = jasmine
          .createSpy('archiveBeanWithRatingQuestion')
          .and.resolveTo();
        spyOn(UIBeanHelper, 'getInstance').and.returnValue({
          archiveBeanWithRatingQuestion,
        } as unknown as UIBeanHelper);
        bean.weight = 20;
        brews.entries = [brewOf('bean-1', 18)];
      });

      it('archives the bean when the user agrees', async () => {
        showConfirm.and.resolveTo('YES');

        await helper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(bean);

        expect(showConfirm).toHaveBeenCalledOnceWith(
          'BEAN_LOOKS_LIKE_CONSUMED',
          undefined,
          true,
        );
        expect(archiveBeanWithRatingQuestion).toHaveBeenCalledOnceWith(bean);
      });

      it('keeps the bean when the user declines', async () => {
        showConfirm.and.resolveTo('NO');

        await helper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(bean);

        expect(archiveBeanWithRatingQuestion).not.toHaveBeenCalled();
      });

      it('does not ask while more than five grams are left', async () => {
        bean.weight = 250;

        await helper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(bean);

        expect(showConfirm).not.toHaveBeenCalled();
        expect(archiveBeanWithRatingQuestion).not.toHaveBeenCalled();
      });
    });
  });

  describe('whether a brew can be started', () => {
    function archived<T extends { finished: boolean }>(entry: T): T {
      entry.finished = true;
      return entry;
    }

    it('allows brewing and importing with an active bean, preparation and mill', () => {
      expect(helper.canBrew()).toBeTrue();
      expect(helper.canBrewIfNotShowMessage()).toBeTrue();
      expect(helper.canImportBrew()).toBeTrue();
      expect(helper.canImportBrewIfNotShowMessage()).toBeTrue();
      expect(presentCustomPopover).not.toHaveBeenCalled();
    });

    it('refuses to brew without a bean, a preparation or a mill and says so', () => {
      for (const missing of [beans, preparations, mills]) {
        const entries = missing.entries;
        missing.entries = [];

        expect(helper.canBrew()).toBeFalse();
        expect(helper.canBrewIfNotShowMessage()).toBeFalse();

        missing.entries = entries;
      }

      expect(presentCustomPopover).toHaveBeenCalledTimes(3);
      expect(presentCustomPopover).toHaveBeenCalledWith(
        'CANT_START_NEW_BREW_TITLE',
        'CANT_START_NEW_BREW_DESCRIPTION',
        'UNDERSTOOD',
      );
    });

    it('does not count archived beans, preparations and mills', () => {
      for (const storage of [beans, preparations, mills]) {
        const entries = storage.entries;
        storage.entries = [
          archived(withUuid(new Bean(), 'archived')),
        ] as never[];

        expect(helper.canBrew()).toBeFalse();

        storage.entries = entries;
      }
    });

    it('imports a brew without a mill, but not without a bean or a preparation', () => {
      mills.entries = [];
      expect(helper.canImportBrew()).toBeTrue();
      expect(helper.canImportBrewIfNotShowMessage()).toBeTrue();
      expect(presentCustomPopover).not.toHaveBeenCalled();

      beans.entries = [archived(withUuid(new Bean(), 'archived'))];
      expect(helper.canImportBrew()).toBeFalse();
      beans.entries = [bean];
      preparations.entries = [];
      expect(helper.canImportBrewIfNotShowMessage()).toBeFalse();

      expect(presentCustomPopover).toHaveBeenCalledOnceWith(
        'CANT_IMPORT_BREW_TITLE',
        'CANT_IMPORT_BREW_DESCRIPTION',
        'UNDERSTOOD',
      );
    });

    it('remembers that brewing is possible until a storage announces a change', () => {
      expect(helper.canBrew()).toBeTrue();

      // Changed without an event, e.g. through the array of getAllEntries()
      beans.entries = [];
      expect(helper.canBrew()).toBeTrue();

      const storages: FakeStorage<IEntry>[] = [beans, preparations, mills];
      for (const storage of storages) {
        const entries = storage === beans ? [bean] : storage.entries;
        storage.change([]);
        expect(helper.canBrew()).toBeFalse();
        storage.change(entries);
        expect(helper.canBrew()).toBeTrue();
      }
    });

    it('checks again every time while brewing is not possible', () => {
      mills.entries = [];
      expect(helper.canBrew()).toBeFalse();

      mills.entries = [mill];

      expect(helper.canBrew()).toBeTrue();
    });
  });

  describe('sorting brews', () => {
    function brewAt(uuid: string, timestamp: number): Brew {
      const brew = withUuid(new Brew(), uuid);
      brew.config.unix_timestamp = timestamp;
      return brew;
    }
    const uuids = (list: Brew[]) => list.map((brew) => brew.config.uuid);

    it('puts the newest first and keeps brews of the same time in their order', () => {
      const list = [
        brewAt('old', 10),
        brewAt('same-a', 20),
        brewAt('new', 30),
        brewAt('same-b', 20),
      ];

      const sorted = UIBrewHelper.sortBrews(list);

      expect(uuids(sorted)).toEqual(['new', 'same-a', 'same-b', 'old']);
      expect(sorted).toBe(list);
    });

    it('leaves a list alone that has the newest first already', () => {
      const list = [brewAt('new', 30), brewAt('middle', 20), brewAt('old', 10)];

      expect(uuids(UIBrewHelper.sortBrews(list))).toEqual([
        'new',
        'middle',
        'old',
      ]);
    });

    it('puts the oldest first and keeps brews of the same time in their order', () => {
      const list = [
        brewAt('new', 30),
        brewAt('same-a', 20),
        brewAt('old', 10),
        brewAt('same-b', 20),
      ];

      const sorted = UIBrewHelper.sortBrewsASC(list);

      expect(uuids(sorted)).toEqual(['old', 'same-a', 'same-b', 'new']);
      expect(sorted).toBe(list);
    });

    it('leaves a list alone that has the oldest first already', () => {
      const list = [brewAt('old', 10), brewAt('middle', 20), brewAt('new', 30)];

      expect(uuids(UIBrewHelper.sortBrewsASC(list))).toEqual([
        'old',
        'middle',
        'new',
      ]);
    });
  });

  describe('sections of the brew form', () => {
    const before = [
      'grind_size',
      'grind_weight',
      'brew_temperature',
      'method_of_preparation',
      'bean_type',
      'mill',
      'mill_speed',
      'mill_timer',
      'water',
      'bean_weight_in',
      'vessel',
    ];
    const during = [
      'pressure_profile',
      'brew_temperature_time',
      'brew_time',
      'coffee_blooming_time',
      'coffee_first_drip_time',
    ];
    const after = [
      'brew_quantity',
      'coffee_type',
      'coffee_concentration',
      'rating',
      'note',
      'set_custom_brew_time',
      'attachments',
      'tds',
      'brew_beverage_quantity',
    ];

    function sections(): boolean[] {
      return [
        helper.showSectionBeforeBrew(preparation),
        helper.showSectionWhileBrew(preparation),
        helper.showSectionAfterBrew(preparation),
      ];
    }

    it('shows no section with every parameter hidden', () => {
      settings.manage_parameters = allParameters(false);

      expect(sections()).toEqual([false, false, false]);
    });

    for (const parameter of Object.keys(new ManageBrewParameter())) {
      const expected = [before, during, after].map((section) =>
        section.includes(parameter),
      );

      it(`${parameter} alone shows before/while/after: ${expected.join('/')}`, () => {
        settings.manage_parameters = onlyParameter(parameter);

        expect(sections()).toEqual(expected);
      });
    }

    it('follows the parameters of a preparation with custom parameters', () => {
      preparation.use_custom_parameters = true;
      preparation.manage_parameters = onlyParameter('brew_time');

      expect(sections()).toEqual([false, true, false]);

      preparation.manage_parameters = allParameters(false);
      expect(sections()).toEqual([false, false, false]);
    });

    it('ignores the parameters of a preparation without custom parameters', () => {
      preparation.use_custom_parameters = false;
      preparation.manage_parameters = allParameters(false);

      expect(sections()).toEqual([true, true, true]);
    });

    it('uses replaced settings once the settings storage announces them', () => {
      const replaced = new Settings();
      replaced.manage_parameters = allParameters(false);
      settings = replaced;

      expect(sections()).toEqual([true, true, true]);
      settingsEvents.next();

      expect(sections()).toEqual([false, false, false]);
    });

    it('picks the preparation value for a preparation with custom parameters', () => {
      expect(helper.fieldVisible(true, false, true)).toBeFalse();
      expect(helper.fieldVisible(true, false, false)).toBeTrue();
      expect(helper.fieldOrder(1, 7, true)).toBe(7);
      expect(helper.fieldOrder(1, 7, false)).toBe(1);
    });
  });

  describe('cupping', () => {
    const scores = [
      'dry_fragrance',
      'wet_aroma',
      'brightness',
      'flavor',
      'body',
      'finish',
      'sweetness',
      'clean_cup',
      'complexity',
      'uniformity',
    ];

    it('is hidden while no score was given', () => {
      const brew = new Brew();
      brew.cupping.cuppers_correction = 3;
      brew.cupping.notes = 'not a score';

      expect(helper.showCupping(brew)).toBeFalse();
    });

    for (const score of scores) {
      it(`is shown for a ${score} score`, () => {
        const brew = new Brew();
        brew.cupping[score] = 0.5;

        expect(helper.showCupping(brew)).toBeTrue();
      });
    }

    it('charts the ten scores of a brew and of a cupping in the same order', () => {
      const brew = new Brew();
      scores.forEach((score, index) => (brew.cupping[score] = index + 1));

      const ofBrew = helper.getCuppingChartData(brew);
      const ofCupping = helper.getCuppingChartData({ ...brew.cupping });

      expect(ofBrew.type).toBe('radar');
      expect(ofBrew.data.datasets[0].data).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ]);
      expect(ofBrew.data.labels).toEqual(
        scores.map((score) => `CUPPING_SCORE_${score.toUpperCase()}`),
      );
      expect(ofCupping.data).toEqual(ofBrew.data);
      expect(ofBrew.options.scale).toEqual({
        beginAtZero: true,
        max: 10,
        min: 0,
        step: 0.1,
      });
    });
  });

  describe('repeating the last brew of a bean by its share code', () => {
    let brewsOfBean: Brew[];

    function brewAt(uuid: string, timestamp: number): Brew {
      const brew = withUuid(new Brew(), uuid);
      brew.config.unix_timestamp = timestamp;
      return link(brew);
    }

    function archivedPart(
      brew: Brew,
      part: 'getBean' | 'getMill' | 'getPreparation',
    ): Brew {
      (brew[part] as jasmine.Spy).and.returnValue({ finished: true });
      return brew;
    }

    beforeEach(() => {
      brewsOfBean = [];
      spyOn(UIBeanHelper, 'getInstance').and.returnValue({
        getAllBrewsForThisBean: (uuid: string) =>
          uuid === 'bean-1' ? brewsOfBean : [],
      } as unknown as UIBeanHelper);
    });

    it('repeats the newest brew whose bean, mill and preparation are active', async () => {
      const repeatable = brewAt('repeatable', 20);
      brewsOfBean = [
        brewAt('older', 10),
        archivedPart(brewAt('newest-archived-mill', 30), 'getMill'),
        repeatable,
      ];

      await helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');

      expect(modalController.opened).toEqual([
        jasmine.objectContaining({
          component: BrewAddComponent,
          componentProps: { brew_template: repeatable },
        }),
      ]);
    });

    it('opens an empty brew form for the bean when no brew can be repeated', async () => {
      brewsOfBean = [archivedPart(brewAt('archived-bean', 10), 'getBean')];

      await helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');

      expect(modalController.opened).toEqual([
        jasmine.objectContaining({
          component: BrewAddComponent,
          componentProps: { bean_preset: bean },
        }),
      ]);
    });

    it('does not repeat a brew whose preparation is archived', async () => {
      const repeatable = brewAt('repeatable', 10);
      brewsOfBean = [
        repeatable,
        archivedPart(
          brewAt('newest-archived-preparation', 30),
          'getPreparation',
        ),
      ];

      await helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');

      expect(modalController.opened[0].componentProps).toEqual({
        brew_template: repeatable,
      });
    });

    it('opens an empty brew form for a bean without brews', async () => {
      await helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');

      expect(modalController.opened[0].componentProps).toEqual({
        bean_preset: bean,
      });
    });

    it('does nothing for an unknown share code', async () => {
      await helper.repeatLastBrewForBeanByInternalShareCode('UNKNOWN');
      await helper.startBrewForBeanByInternalShareCode('UNKNOWN');

      expect(modalController.opened).toEqual([]);
      expect(presentCustomPopover).not.toHaveBeenCalled();
    });

    it('repeats a brew although no mill is active any more', async () => {
      const repeatable = brewAt('repeatable', 20);
      brewsOfBean = [repeatable];
      mills.entries = [];

      await helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');

      expect(modalController.opened[0].componentProps).toEqual({
        brew_template: repeatable,
      });
      expect(presentCustomPopover).not.toHaveBeenCalled();
    });
  });

  describe('editing and rating a brew', () => {
    const dialogs = [
      {
        name: 'editing',
        component: BrewEditComponent,
        open: (brew: Brew) => helper.editBrew(brew),
      },
      {
        name: 'rating',
        component: BrewRatingComponent,
        open: (brew: Brew) => helper.rateBrew(brew),
      },
    ];

    for (const dialog of dialogs) {
      it(`returns the stored brew after ${dialog.name}, not the one handed in`, async () => {
        const handedIn = recordedBrew();
        modalController.whileOpen = () => {
          const saved = recordedBrew();
          saved.rating = 5;
          brews.entries = [stored(saved) as unknown as Brew];
        };

        const returned = await dialog.open(handedIn);

        expect(modalController.opened).toEqual([
          jasmine.objectContaining({
            component: dialog.component,
            componentProps: { brew: handedIn },
          }),
        ]);
        expect(returned).toBeInstanceOf(Brew);
        expect(returned).not.toBe(handedIn);
        expect(returned.rating).toBe(5);
        expect(returned.config.uuid).toBe('brew-1');
        expect(handedIn.rating).toBe(4);
      });

      it(`known gap: returns an empty brew when the brew is gone after ${dialog.name}`, async () => {
        brews.entries = [];

        const returned = await dialog.open(recordedBrew());

        expect(stored(returned)).toEqual(stored(new Brew()));
      });
    }
  });

  describe('choosing the brew sorting', () => {
    const sort = { sort_after: 'brew_time', sort_order: 'ascending' };

    it('hands a copy to the dialog and returns the chosen sorting', async () => {
      const chosen = { sort_after: 'rating', sort_order: 'descending' };
      modalController.dismissData = { brew_sort: chosen };

      const result = await helper.showSort(sort as never);

      const handedOver = modalController.opened[0].componentProps.brew_sort;
      expect(handedOver).toEqual(sort);
      expect(handedOver).not.toBe(sort);
      expect(result).toBe(chosen);
    });

    it('returns nothing when the dialog is closed without a choice', async () => {
      modalController.dismissData = undefined;

      expect(await helper.showSort(sort as never)).toBeUndefined();
    });
  });

  describe('tracking the used brew parameters', () => {
    const used = (name: string, preparationName = 'V60') => ({
      category: 'BREW',
      action: `PARAMETER_USED_${preparationName}`,
      name,
    });
    const customParameters = (active: boolean) => ({
      category: 'BREW',
      action: 'CUSTOM_PARAMETERS',
      name: active ? 'YES' : 'NO',
    });

    function trackedEvents(): unknown[] {
      expect(trackBulkEvents).toHaveBeenCalledTimes(1);
      return trackBulkEvents.calls.mostRecent().args[0] as unknown[];
    }

    beforeEach(() => {
      settings.manage_parameters = allParameters(false);
    });

    it('only tells that no custom parameters were used when no parameter is shown and no device is connected', () => {
      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([customParameters(false)]);
    });

    it('tells that the preparation has custom parameters, without its name', () => {
      preparation.name = 'Annas Bialetti';
      preparation.use_custom_parameters = true;
      preparation.manage_parameters = allParameters(false);

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([customParameters(true)]);
    });

    it('sends one event per shown parameter of the settings', () => {
      settings.manage_parameters.brew_time = true;
      settings.manage_parameters.rating = true;

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual(
        jasmine.arrayWithExactContents([
          customParameters(false),
          used('brew_time'),
          used('rating'),
        ]),
      );
    });

    it('sends the parameters of a preparation with custom parameters instead', () => {
      settings.manage_parameters.brew_time = true;
      preparation.use_custom_parameters = true;
      preparation.manage_parameters = onlyParameter('tds');

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([customParameters(true), used('tds')]);
    });

    // Privacy: the name the user gave the preparation and the advertised
    // names of the connected devices leave the device with these events.
    it('known gap: sends the preparation name and the names of connected devices', () => {
      preparation.name = 'Annas Bialetti';
      preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
      connectedScale = { device_name: 'LUNAR-1A2B3C' };
      connectedPressureDevice = { device_name: 'PRS12345' };

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([
        customParameters(false),
        used('SCALE_DEVICE_LUNAR-1A2B3C', 'Annas Bialetti'),
        used('PRESSURE_DEVICE_PRS12345', 'Annas Bialetti'),
      ]);
    });

    it('leaves out the pressure device for a preparation that is no espresso', () => {
      preparation.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
      connectedPressureDevice = { device_name: 'PRS12345' };

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([customParameters(false)]);
    });

    // The only place where a whole brew reaches Matomo.
    it('sends no location of the brew, even with every parameter shown', () => {
      settings.manage_parameters = allParameters(true);
      settings.track_brew_coordinates = true;
      const brew = recordedBrew();
      brew.coordinates = {
        accuracy: 5,
        altitude: 34.5,
        altitudeAccuracy: 3,
        heading: null,
        latitude: 52.520008,
        longitude: 13.404954,
        speed: null,
      };

      helper.logUsedBrewParameters(link(brew));

      const sent = JSON.stringify(trackedEvents());
      for (const value of ['52.52', '13.40', '34.5']) {
        expect(sent).not.toContain(value);
      }
    });

    it('leaves out devices that are not connected', () => {
      preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
      settings.manage_parameters.note = true;

      helper.logUsedBrewParameters(link(recordedBrew()));

      expect(trackedEvents()).toEqual([customParameters(false), used('note')]);
    });
  });
});
