import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { Brew } from '../../../../classes/brew/brew';
import { REFERENCE_GRAPH_TYPE } from '../../../../enums/brews/referenceGraphType';
import { DeviceIdentityService } from '../../../../services/deviceIdentity/device-identity.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UILog } from '../../../../services/uiLog';
import { UIStorage } from '../../../../services/uiStorage';
import {
  createMockTranslateService,
  createMockUIAlert,
  createMockUILog,
} from '../../../../test-utils';
import { BrewAddComponent } from '../brew-add.component';

describe('BrewAddComponent finish', () => {
  const CUSTOM_DATE = '2024-01-02T03:04:05.000Z';
  let mockUIStorage: jasmine.SpyObj<UIStorage>;
  let brewStorage: UIBrewStorage;
  let events: { type: string }[];
  let brewing: any;
  let component: BrewAddComponent;
  let dismiss: jasmine.Spy;

  const spies = (
    name: string,
    methods: string[],
  ): Record<string, jasmine.Spy> => {
    const obj: Record<string, jasmine.Spy> = jasmine.createSpyObj(
      name,
      methods,
    );
    for (const method of methods) {
      obj[method].and.returnValue(Promise.resolve());
    }
    return obj;
  };

  let uiToast: jasmine.SpyObj<{ showInfoToast: (_text: string) => void }>;
  let brewTracking: jasmine.SpyObj<{ trackBrew: (_brew: Brew) => void }>;

  const createComponent = (setCustomBrewTime: boolean): BrewAddComponent => {
    const data = new Brew();
    data.grind_weight = 18;
    data.brew_quantity = 36;
    data.note = 'Sweet';
    const uiBrewHelper = jasmine.createSpyObj('UIBrewHelper', [
      'cleanInvisibleBrewData',
      'logUsedBrewParameters',
      'checkIfBeanPackageIsConsumed',
    ]);
    uiBrewHelper.checkIfBeanPackageIsConsumed.and.returnValue(false);
    dismiss = jasmine.createSpy('dismiss');
    uiToast = jasmine.createSpyObj('UIToast', ['showInfoToast']);
    brewTracking = jasmine.createSpyObj('BrewTracking', ['trackBrew']);
    return Object.assign(Object.create(BrewAddComponent.prototype), {
      data,
      brewBrewing: brewing,
      brew_flow_preset: {},
      hide_toast_message: true,
      settings: {
        manage_parameters: { set_custom_brew_time: setCustomBrewTime },
        bean_manage_parameters: { openDate: false },
        visualizer_active: false,
        track_caffeine_consumption: false,
      },
      uiBrewStorage: brewStorage,
      uiBrewHelper,
      uiPreparationStorage: {
        getByUUID: () => ({ use_custom_parameters: false }),
      },
      uiPreparationHelper: spies('UIPreparationHelper', [
        'doMachineSpecificSyncs',
      ]),
      uiAlert: spies('UIAlert', [
        'showLoadingMessage',
        'hideLoadingSpinner',
        'showMessage',
      ]),
      uiLog: createMockUILog(),
      uiToast,
      brewTracking,
      uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackBulkEvents']),
      dismiss,
    }) as BrewAddComponent;
  };

  beforeEach(async () => {
    mockUIStorage = jasmine.createSpyObj<UIStorage>('UIStorage', [
      'get',
      'getOrFail',
      'set',
    ]);
    mockUIStorage.getOrFail.and.resolveTo(null);
    mockUIStorage.set.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: mockUIStorage },
        { provide: UILog, useValue: createMockUILog() },
        { provide: TranslateService, useValue: createMockTranslateService() },
        {
          provide: DeviceIdentityService,
          useValue: { getDeviceId: () => 'device-a' },
        },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue(createMockUIAlert());
    brewStorage = TestBed.runInInjectionContext(() => new UIBrewStorage());
    await brewStorage.initializeStorage();
    events = [];
    brewStorage.attachOnEvent().subscribe((event) => events.push(event));

    const preparation = { type: 'ESPRESSO', style_type: 'ESPRESSO' };
    spyOn(Brew.prototype, 'getPreparation').and.returnValue(preparation as any);
    spyOn(Brew.prototype, 'getBean').and.returnValue({
      roaster: '',
      openDate: '2024-01-01',
    } as any);

    brewing = {
      timer: { isTimerRunning: () => false },
      customCreationDate: CUSTOM_DATE,
      brewBrewingGraphEl: {
        flow_profile_raw: {
          weight: [1],
          pressureFlow: [],
          temperatureFlow: [],
        },
        reference_profile_raw: { weight: [2] },
      },
      saveFlowProfile: jasmine
        .createSpy('saveFlowProfile')
        .and.callFake((uuid: string) =>
          Promise.resolve(`brews/${uuid}_flow_profile.json`),
        ),
      saveReferenceFlowProfile: jasmine
        .createSpy('saveReferenceFlowProfile')
        .and.callFake((uuid: string) =>
          Promise.resolve(`importedGraph/${uuid}_flow_profile.json`),
        ),
    };
  });

  it('stores a new brew with flow profile and custom time with one write and one event', async () => {
    component = createComponent(true);
    const before = JSON.parse(JSON.stringify(component.data));

    await component.finish();

    expect(mockUIStorage.set.calls.count()).toBe(1);
    expect(events.map((event) => event.type)).toEqual(['ADD']);
    const [stored] = brewStorage.getAllEntries();
    const uuid = stored.config.uuid;
    expect(uuid).toBeTruthy();
    expect(brewing.saveFlowProfile).toHaveBeenCalledOnceWith(uuid);
    expect(brewing.saveReferenceFlowProfile).toHaveBeenCalledOnceWith(uuid);

    const { config, ...fields } = JSON.parse(JSON.stringify(stored));
    const expected = before;
    delete expected.config;
    expected.flow_profile = `brews/${uuid}_flow_profile.json`;
    expected.reference_flow_profile = {
      type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
      uuid,
    };
    expect(fields).toEqual(expected);
    expect(config.unix_timestamp).toBe(moment(CUSTOM_DATE).unix());
    expect(config.rev).toBe(1);
    expect(dismiss).toHaveBeenCalled();
  });

  it('names the bean events of a brew with water and grinder by the event title', async () => {
    (Brew.prototype.getBean as jasmine.Spy).and.returnValue({
      roaster: 'Roaster',
      name: 'Bean',
      openDate: '2024-01-01',
    } as any);
    spyOn(Brew.prototype, 'getWater').and.returnValue({ name: 'Soft' } as any);
    spyOn(Brew.prototype, 'getMill').and.returnValue({ name: 'Mill' } as any);
    component = createComponent(false);

    await component.finish();

    const [tracked] = (
      component as any
    ).uiAnalytics.trackBulkEvents.calls.mostRecent().args as [
      { category: string; action: string; name: string }[],
    ];
    const beanEvents = tracked.filter((event) => event.category === 'BEAN');
    expect(beanEvents.map((event) => event.name)).toContain('WATER_NAME_Soft');
    expect(beanEvents.map((event) => event.name)).toContain(
      'GRINDER_NAME_Mill',
    );
    expect(beanEvents.map((event) => event.action)).toEqual(
      Array(5).fill('BREW_TRACKED_Roaster_Bean'),
    );
  });

  it('keeps the save time and an empty flow profile when nothing else is set', async () => {
    brewing.brewBrewingGraphEl.flow_profile_raw.weight = [];
    component = createComponent(false);
    const savedAfter = Math.floor(Date.now() / 1000);

    await component.finish();

    expect(mockUIStorage.set.calls.count()).toBe(1);
    expect(events.map((event) => event.type)).toEqual(['ADD']);
    const [stored] = brewStorage.getAllEntries();
    expect(brewing.saveFlowProfile).not.toHaveBeenCalled();
    expect(stored.flow_profile).toBe('');
    expect(stored.reference_flow_profile.type).toBe(REFERENCE_GRAPH_TYPE.NONE);
    expect(stored.config.unix_timestamp).toBeGreaterThanOrEqual(savedAfter);
  });

  it('keeps the flow profile empty when its file cannot be written', async () => {
    brewing.saveFlowProfile.and.resolveTo('');
    component = createComponent(true);

    await component.finish();

    expect(mockUIStorage.set.calls.count()).toBe(1);
    const [stored] = brewStorage.getAllEntries();
    expect(stored.flow_profile).toBe('');
  });

  it('still stores the brew when its flow profile cannot be handled', async () => {
    brewing.saveFlowProfile.and.rejectWith(new Error('no file system'));
    component = createComponent(true);

    await component.finish();

    expect(mockUIStorage.set.calls.count()).toBe(1);
    const [stored] = brewStorage.getAllEntries();
    expect(stored.flow_profile).toBe('');
    expect(stored.note).toBe('Sweet');
  });

  it('stays open with what was entered when the brew could not be stored, and stores it on the next try', async () => {
    component = createComponent(true);
    Object.assign(component, { hide_toast_message: false });
    mockUIStorage.set.and.resolveTo(false);

    await component.finish();

    expect(brewStorage.getAllEntries()).toEqual([]);
    expect(dismiss).not.toHaveBeenCalled();
    expect(uiToast.showInfoToast).not.toHaveBeenCalled();
    expect(brewTracking.trackBrew).not.toHaveBeenCalled();
    expect(component.data.note).toBe('Sweet');
    const { uiAlert } = component as unknown as {
      uiAlert: Record<string, jasmine.Spy>;
    };
    expect(uiAlert.hideLoadingSpinner).toHaveBeenCalledTimes(1);
    // The collection has reported the failed save itself.
    expect(uiAlert.showMessage).not.toHaveBeenCalled();

    mockUIStorage.set.and.resolveTo(true);
    await component.finish();

    const [stored] = brewStorage.getAllEntries();
    expect(brewStorage.getAllEntries().length).toBe(1);
    expect(stored.note).toBe('Sweet');
    // The same files again, none is left behind under another name.
    expect(brewing.saveFlowProfile.calls.allArgs()).toEqual([
      [stored.config.uuid],
      [stored.config.uuid],
    ]);
    expect(brewing.saveReferenceFlowProfile).toHaveBeenCalledOnceWith(
      stored.config.uuid,
    );
    expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(
      'TOAST_BREW_ADDED_SUCCESSFULLY',
    );
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
