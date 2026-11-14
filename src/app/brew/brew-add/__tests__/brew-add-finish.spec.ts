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
      uiAlert: spies('UIAlert', ['showLoadingMessage', 'hideLoadingSpinner']),
      uiLog: createMockUILog(),
      uiToast: jasmine.createSpyObj('UIToast', ['showInfoToast']),
      brewTracking: jasmine.createSpyObj('BrewTracking', ['trackBrew']),
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
});
