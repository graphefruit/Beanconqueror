import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import type { IHandoffEnvelope } from '../../../interfaces/brew/IHandoff';
import { BrewImportService } from '../../brewImport/brew-import.service';
import { CoffeeBluetoothDevicesService } from '../../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { ServerCommunicationService } from '../../serverCommunication/server-communication.service';
import { UIAlert } from '../../uiAlert';
import { UIAnalytics } from '../../uiAnalytics';
import { UIBeanHelper } from '../../uiBeanHelper';
import { UIBeanStorage } from '../../uiBeanStorage';
import { UIBrewHelper } from '../../uiBrewHelper';
import { UIBrewStorage } from '../../uiBrewStorage';
import { UIHelper } from '../../uiHelper';
import { UILog } from '../../uiLog';
import { UIMillStorage } from '../../uiMillStorage';
import { UIPreparationStorage } from '../../uiPreparationStorage';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { VisualizerService } from '../../visualizerService/visualizer-service.service';
import { IntentHandlerService } from '../intent-handler.service';

async function gzipBase64Url(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const gzipped = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  gzipped.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function handoffUrl(payload: string): string {
  const chunks = payload.match(/.{1,400}/g) ?? [''];
  const params = [`len=${payload.length}`];
  chunks.forEach((chunk, index) => {
    params.push(`shareBrew${index}=${chunk}`);
  });
  return `beanconqueror://ADD_BREW?${params.join('&')}`;
}

function validEnvelope(): IHandoffEnvelope {
  return {
    v: 1,
    app: { name: 'Sender', version: '1.0' },
    brew: {
      date: '2026-09-20T12:00:00.000Z',
      doseIn: { value: 18, unit: 'g' },
      waterIn: { value: 300, unit: 'ml' },
      beverageOut: { value: 240, unit: 'g' },
      brewTime: 210,
      temperature: 93,
      ratio: 16.7,
      grindSize: '42',
      grinderRpm: 60,
      grinderName: 'Any grinder',
      preparationMethod: 'Any brewer',
      bloomTime: 35,
      firstDripTime: 12,
      note: 'A completed brew',
    },
    bean: { name: 'Any coffee' },
    flow: {
      fidelity: 'full',
      t: [0, 1000, 1000],
      waterDispensed: [0, 125, 125],
      weight: [0, 50, 75],
      temperature: [91, 92, 93],
    },
    metrics: [
      {
        key: 'targetTemperature',
        name: 'Target temp',
        unit: '°C',
        kind: 'target',
        t: [0, 200000],
        v: [93, 93],
      },
    ],
    imported: {
      source: 'any-sender',
      sourceName: 'Any Sender',
      sourceUrl: 'https://example.com/brew/1',
      device: 'Any brewer',
      schema: 1,
      params: { recipe: 'abc123' },
    },
  };
}

describe('IntentHandlerService', () => {
  let service: IntentHandlerService;
  let uiHelper: jasmine.SpyObj<UIHelper>;
  let uiLog: jasmine.SpyObj<UILog>;
  let serverCommunicationService: jasmine.SpyObj<ServerCommunicationService>;
  let uiBeanHelper: jasmine.SpyObj<UIBeanHelper>;
  let uiAlert: jasmine.SpyObj<UIAlert>;
  let uiAnalytics: jasmine.SpyObj<UIAnalytics>;
  let visualizerService: jasmine.SpyObj<VisualizerService>;
  let brewImportService: jasmine.SpyObj<BrewImportService>;
  let beanStorage: jasmine.SpyObj<UIBeanStorage>;
  let millStorage: jasmine.SpyObj<UIMillStorage>;
  let preparationStorage: jasmine.SpyObj<UIPreparationStorage>;
  let brewStorage: jasmine.SpyObj<UIBrewStorage>;
  let settingsStorage: jasmine.SpyObj<UISettingsStorage>;
  let envelope: IHandoffEnvelope;
  let url: string;

  beforeEach(async () => {
    const eventEmitter = {
      subscribe: () => ({ unsubscribe: () => undefined }),
    };

    uiHelper = jasmine.createSpyObj('UIHelper', ['isBeanconqurorAppReady']);
    uiLog = jasmine.createSpyObj('UILog', ['log', 'error']);
    serverCommunicationService = jasmine.createSpyObj(
      'ServerCommunicationService',
      ['getBeanInformation'],
    );
    uiBeanHelper = jasmine.createSpyObj('UIBeanHelper', [
      'addScannedQRBean',
      'addUserSharedBean',
      'chooseNFCTagAction',
      'detailBeanByInternalShareCode',
      'editBeanByInternalShareCode',
    ]);
    uiAlert = jasmine.createSpyObj('UIAlert', [
      'showLoadingSpinner',
      'hideLoadingSpinner',
      'showMessage',
      'isLoadingSpinnerShown',
      'presentCustomPopover',
    ]);
    uiAnalytics = jasmine.createSpyObj('UIAnalytics', ['trackEvent']);
    visualizerService = jasmine.createSpyObj('VisualizerService', [
      'importShotWithSharedCode',
    ]);
    brewImportService = jasmine.createSpyObj('BrewImportService', [
      'ensureBeanFromHandoff',
      'import',
    ]);
    beanStorage = jasmine.createSpyObj('UIBeanStorage', [
      'attachOnEvent',
      'getAllEntries',
    ]);
    millStorage = jasmine.createSpyObj('UIMillStorage', [
      'attachOnEvent',
      'getAllEntries',
    ]);
    preparationStorage = jasmine.createSpyObj('UIPreparationStorage', [
      'attachOnEvent',
      'getAllEntries',
    ]);
    brewStorage = jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']);
    settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
      'attachOnEvent',
      'getSettings',
    ]);

    uiHelper.isBeanconqurorAppReady.and.resolveTo();
    uiAlert.showLoadingSpinner.and.resolveTo();
    uiAlert.hideLoadingSpinner.and.resolveTo();
    uiAlert.isLoadingSpinnerShown.and.returnValue(false);
    brewImportService.ensureBeanFromHandoff.and.resolveTo();
    brewImportService.import.and.resolveTo();
    beanStorage.attachOnEvent.and.returnValue(eventEmitter as never);
    millStorage.attachOnEvent.and.returnValue(eventEmitter as never);
    preparationStorage.attachOnEvent.and.returnValue(eventEmitter as never);
    settingsStorage.attachOnEvent.and.returnValue(eventEmitter as never);
    settingsStorage.getSettings.and.returnValue(new Settings());
    beanStorage.getAllEntries.and.returnValue([{ finished: false }] as never);
    millStorage.getAllEntries.and.returnValue([]);
    preparationStorage.getAllEntries.and.returnValue([
      { finished: false },
    ] as never);

    TestBed.configureTestingModule({
      providers: [
        IntentHandlerService,
        { provide: UIHelper, useValue: uiHelper },
        { provide: UILog, useValue: uiLog },
        {
          provide: ServerCommunicationService,
          useValue: serverCommunicationService,
        },
        { provide: UIBeanHelper, useValue: uiBeanHelper },
        UIBrewHelper,
        { provide: UIAlert, useValue: uiAlert },
        { provide: UIAnalytics, useValue: uiAnalytics },
        { provide: VisualizerService, useValue: visualizerService },
        { provide: BrewImportService, useValue: brewImportService },
        { provide: UIBeanStorage, useValue: beanStorage },
        { provide: UIMillStorage, useValue: millStorage },
        { provide: UIPreparationStorage, useValue: preparationStorage },
        { provide: UIBrewStorage, useValue: brewStorage },
        { provide: UISettingsStorage, useValue: settingsStorage },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj('TranslateService', ['instant']),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create']),
        },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {},
        },
        {
          provide: NgZone,
          useValue: jasmine.createSpyObj('NgZone', {
            run: (fn: () => unknown) => fn(),
          }),
        },
      ],
    });

    service = TestBed.inject(IntentHandlerService);
    envelope = validEnvelope();
    url = handoffUrl(await gzipBase64Url(envelope));
  });

  it('imports a brew handoff when the user has no mill', async () => {
    await service.handleDeepLink(url);

    expect(brewImportService.import).toHaveBeenCalledOnceWith(envelope);
    expect(uiAlert.showMessage).toHaveBeenCalledWith(
      'BREW_IMPORT_SUCCESSFUL',
      undefined,
      undefined,
      true,
    );
  });

  it('blocks brew handoff import with the import message when no bean fallback exists', async () => {
    beanStorage.getAllEntries.and.returnValue([]);

    await service.handleDeepLink(url);

    expect(brewImportService.import).not.toHaveBeenCalled();
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
    expect(uiAlert.presentCustomPopover).toHaveBeenCalledWith(
      'CANT_IMPORT_BREW_TITLE',
      'CANT_IMPORT_BREW_DESCRIPTION',
      'UNDERSTOOD',
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalledWith(
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  });

  it('blocks brew handoff import with the import message when no preparation fallback exists', async () => {
    preparationStorage.getAllEntries.and.returnValue([]);

    await service.handleDeepLink(url);

    expect(brewImportService.import).not.toHaveBeenCalled();
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
    expect(uiAlert.presentCustomPopover).toHaveBeenCalledWith(
      'CANT_IMPORT_BREW_TITLE',
      'CANT_IMPORT_BREW_DESCRIPTION',
      'UNDERSTOOD',
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalledWith(
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  });

  it('creates the pod bean before deciding whether the import can proceed', async () => {
    const order: string[] = [];
    beanStorage.getAllEntries.and.callFake(() => {
      order.push('read');
      return [] as never;
    });
    brewImportService.ensureBeanFromHandoff.and.callFake(() => {
      order.push('ensure');
      return Promise.resolve();
    });

    await service.handleDeepLink(url);

    expect(brewImportService.ensureBeanFromHandoff.calls.allArgs()).toEqual([
      [envelope],
    ]);
    expect(order[0]).toBe('ensure');
    expect(brewImportService.import.calls.count()).toBe(0);
    expect(uiAlert.showLoadingSpinner.calls.count()).toBe(0);
  });

  it('blocks brew handoff import when only archived beans are available', async () => {
    beanStorage.getAllEntries.and.returnValue([{ finished: true }] as never);

    await service.handleDeepLink(url);

    expect(brewImportService.import).not.toHaveBeenCalled();
    expect(uiAlert.presentCustomPopover).toHaveBeenCalledWith(
      'CANT_IMPORT_BREW_TITLE',
      'CANT_IMPORT_BREW_DESCRIPTION',
      'UNDERSTOOD',
    );
  });

  it('imports a brew handoff when the library can import a brew', async () => {
    millStorage.getAllEntries.and.returnValue([{ finished: false }] as never);

    await service.handleDeepLink(url);

    expect(uiLog.log).toHaveBeenCalledWith(
      `Handle deeplink: ADD_BREW (${url.length} chars)`,
    );
    expect(uiLog.log).not.toHaveBeenCalledWith('Handle deeplink: ' + url);
    expect(brewImportService.import.calls.allArgs()).toEqual([[envelope]]);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_SUCCESSFUL',
      undefined,
      undefined,
      true,
    ]);
  });

  it('reports a brew handoff import failure after a decodable payload reaches import', async () => {
    brewImportService.import.and.rejectWith(new Error('Import failed'));

    await service.handleDeepLink(url);

    expect(brewImportService.import.calls.count()).toBe(1);
    expect(uiAlert.hideLoadingSpinner.calls.count()).toBeGreaterThan(0);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });
});
