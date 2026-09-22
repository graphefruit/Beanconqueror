import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import type { IHandoffEnvelope } from '../../../interfaces/brew/IHandoff';
import {
  BrewImportRollbackError,
  BrewImportService,
  type IBrewImportResult,
} from '../../brewImport/brew-import.service';
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

function batchHandoffUrl(payload: string): string {
  return handoffUrl(payload).replace(
    'beanconqueror://ADD_BREW?',
    'beanconqueror://ADD_BREWS?',
  );
}

function withTrailingSlash(url: string): string {
  return url.replace('?', '/?');
}

function validEnvelope(
  overrides: Partial<IHandoffEnvelope> = {},
): IHandoffEnvelope {
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
    ...overrides,
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
  let translate: jasmine.SpyObj<TranslateService>;
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
      'setLoadingSpinnerMessage',
      'showMessage',
      'showConfirm',
      'isLoadingSpinnerShown',
      'presentCustomPopover',
    ]);
    uiAnalytics = jasmine.createSpyObj('UIAnalytics', ['trackEvent']);
    translate = jasmine.createSpyObj('TranslateService', ['instant']);
    visualizerService = jasmine.createSpyObj('VisualizerService', [
      'importShotWithSharedCode',
    ]);
    brewImportService = jasmine.createSpyObj('BrewImportService', [
      'ensureBeanFromHandoff',
      'canCreateBeanFromHandoff',
      'createBeanFromHandoff',
      'import',
    ]);
    beanStorage = jasmine.createSpyObj('UIBeanStorage', [
      'attachOnEvent',
      'getAllEntries',
      'removeByUUID',
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
    uiAlert.showConfirm.and.resolveTo('YES');
    uiAlert.isLoadingSpinnerShown.and.returnValue(false);
    beanStorage.removeByUUID.and.resolveTo(true);
    translate.instant.and.callFake((key: string, params?: unknown) => {
      if (
        key === 'BREW_IMPORT_BATCH_RESULT' &&
        params &&
        typeof params === 'object'
      ) {
        const counts = params as { imported: number; total: number };
        return `Imported ${counts.imported} of ${counts.total} brews`;
      }
      if (
        key === 'BREW_IMPORT_BATCH_PROGRESS' &&
        params &&
        typeof params === 'object'
      ) {
        const counts = params as { current: number; total: number };
        return `Importing ${counts.current} of ${counts.total}`;
      }
      if (
        key === 'BREW_IMPORT_CREATE_BEANS_TITLE' &&
        params &&
        typeof params === 'object'
      ) {
        const counts = params as { count: number };
        return `Create ${counts.count} coffees?`;
      }
      if (
        key === 'BREW_IMPORT_CREATE_BEANS_DESCRIPTION' &&
        params &&
        typeof params === 'object'
      ) {
        const counts = params as { count: number };
        return `Create ${counts.count} coffees before importing?`;
      }
      return key;
    });
    brewImportService.ensureBeanFromHandoff.and.resolveTo();
    brewImportService.canCreateBeanFromHandoff.and.returnValue(true);
    brewImportService.createBeanFromHandoff.and.resolveTo();
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
        { provide: UIBeanStorage, useValue: beanStorage },
        { provide: TranslateService, useValue: translate },
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
      return Promise.resolve(undefined as never);
    });

    await service.handleDeepLink(url);

    expect(brewImportService.ensureBeanFromHandoff.calls.allArgs()).toEqual([
      [envelope],
    ]);
    expect(order[0]).toBe('ensure');
    expect(brewImportService.import.calls.count()).toBe(0);
    expect(uiAlert.showLoadingSpinner.calls.count()).toBe(0);
  });

  it('removes a handoff-created bean when the import cannot proceed', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    preparationStorage.getAllEntries.and.returnValue([]);

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.allArgs()).toEqual([
      ['bean-created'],
    ]);
    expect(brewImportService.import.calls.count()).toBe(0);
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

  it('imports a brew handoff with a trailing slash before the query', async () => {

    await service.handleDeepLink(withTrailingSlash(url));

    expect(brewImportService.import.calls.allArgs()).toEqual([[envelope]]);
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

  it('removes a handoff-created bean when import fails', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    brewImportService.import.and.rejectWith(new Error('Import failed'));

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.allArgs()).toEqual([
      ['bean-created'],
    ]);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });
  it('imports every brew in a well-formed batch handoff', async () => {
    const first = validEnvelope({ bean: { name: 'First coffee' } });
    const second = validEnvelope({
      bean: { name: 'Second coffee' },
      brew: { ...validEnvelope().brew, note: 'Second brew' },
    });
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [first, second] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(brewImportService.ensureBeanFromHandoff.calls.count()).toBe(0);
    expect(uiAlert.showConfirm.calls.allArgs()).toEqual([
      ['Create 2 coffees before importing?', 'Create 2 coffees?', false],
    ]);
    expect(brewImportService.createBeanFromHandoff.calls.allArgs()).toEqual([
      [first],
      [second],
    ]);
    expect(brewImportService.import.calls.allArgs()).toEqual([
      [first],
      [second],
    ]);
    expect(uiAlert.showLoadingSpinner.calls.count()).toBe(1);
    expect(uiAlert.setLoadingSpinnerMessage.calls.allArgs()).toEqual([
      ['Importing 1 of 2'],
      ['Importing 2 of 2'],
    ]);
    expect(uiAlert.hideLoadingSpinner.calls.count()).toBe(1);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'Imported 2 of 2 brews',
      undefined,
      undefined,
      false,
    ]);
  });

  it('routes an ADD_BREWS URL away from the single brew handoff handler', async () => {
    const singleHandler = spyOn(
      service as unknown as {
        addBrewFromHandoff: (_url: string) => Promise<void>;
      },
      'addBrewFromHandoff',
    ).and.callThrough();
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [envelope] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(singleHandler).not.toHaveBeenCalled();
    expect(brewImportService.import.calls.allArgs()).toEqual([[envelope]]);
  });

  it('imports a batch handoff with a trailing slash before the query', async () => {
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [envelope] }),
    );

    await service.handleDeepLink(withTrailingSlash(batchUrl));

    expect(brewImportService.import.calls.allArgs()).toEqual([[envelope]]);
  });

  it('asks once for the same bean across several batch brews', async () => {
    const first = validEnvelope({
      bean: { name: 'Same Pod', origin: 'Ethiopia' },
    });
    const second = validEnvelope({
      bean: { name: ' same pod ', origin: 'Ethiopia' },
      brew: { ...validEnvelope().brew, note: 'Same pod again' },
    });
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [first, second] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(brewImportService.ensureBeanFromHandoff.calls.allArgs()).toEqual([
      [first],
    ]);
    expect(uiAlert.showConfirm.calls.count()).toBe(0);
    expect(brewImportService.import.calls.count()).toBe(2);
  });

  it('asks once for several new batch beans and creates none when declined', async () => {
    uiAlert.showConfirm.and.resolveTo('NO');
    const first = validEnvelope({ bean: { name: 'First coffee' } });
    const second = validEnvelope({
      bean: { name: 'Second coffee' },
      brew: { ...validEnvelope().brew, note: 'Second brew' },
    });
    const third = validEnvelope({
      bean: { name: 'Third coffee' },
      brew: { ...validEnvelope().brew, note: 'Third brew' },
    });
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [first, second, third] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(uiAlert.showConfirm.calls.allArgs()).toEqual([
      ['Create 3 coffees before importing?', 'Create 3 coffees?', false],
    ]);
    expect(brewImportService.ensureBeanFromHandoff.calls.count()).toBe(0);
    expect(brewImportService.createBeanFromHandoff.calls.count()).toBe(0);
    expect(brewImportService.import.calls.count()).toBe(3);
  });

  it('imports batch survivors and reports the imported count after a partial failure', async () => {
    const first = validEnvelope({
      brew: { ...validEnvelope().brew, note: 'One' },
    });
    const second = validEnvelope({
      brew: { ...validEnvelope().brew, note: 'Two' },
    });
    const third = validEnvelope({
      brew: { ...validEnvelope().brew, note: 'Three' },
    });
    brewImportService.import.and.callFake((candidate: IHandoffEnvelope) => {
      if (candidate.brew.note === 'Two') {
        return Promise.reject(new Error('Import failed'));
      }
      return Promise.resolve({} as IBrewImportResult);
    });
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [first, second, third] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(brewImportService.import.calls.allArgs()).toEqual([
      [first],
      [second],
      [third],
    ]);
    expect(uiAlert.hideLoadingSpinner.calls.count()).toBe(1);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'Imported 2 of 3 brews',
      undefined,
      undefined,
      false,
    ]);
    expect(uiAlert.showMessage.calls.allArgs()).not.toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });

  it('leaves a handoff-created bean when import rollback could not remove its brew', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    brewImportService.import.and.rejectWith(
      new BrewImportRollbackError('brew-created', false, 'bean-created'),
    );

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.count()).toBe(0);
    expect(uiLog.error.calls.allArgs()).toContain([
      'Import brew from handoff link kept bean bean-created because imported brew brew-created could not be rolled back.',
    ]);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });

  it('removes a handoff-created bean when a failed rollback kept a brew linked to a different bean', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    brewImportService.import.and.rejectWith(
      new BrewImportRollbackError('brew-created', false, 'bean-existing'),
    );

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.allArgs()).toEqual([
      ['bean-created'],
    ]);
  });

  it('leaves a handoff-created bean when a failed rollback did not report the brew bean link', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    const rollbackError = new BrewImportRollbackError(
      'brew-created',
      false,
      'bean-created',
    ) as BrewImportRollbackError & { beanUuid?: string };
    delete rollbackError.beanUuid;
    brewImportService.import.and.rejectWith(rollbackError);

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.count()).toBe(0);
    expect(uiLog.error.calls.allArgs()).toContain([
      'Import brew from handoff link kept bean bean-created because imported brew brew-created could not be rolled back.',
    ]);
  });

  it('removes a handoff-created bean when import rolled its brew back durably', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    brewImportService.import.and.rejectWith(
      new BrewImportRollbackError('brew-created', true, 'bean-created'),
    );

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.allArgs()).toEqual([
      ['bean-created'],
    ]);
  });

  it('logs a failed rollback delete without replacing the import failure', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo('bean-created');
    brewImportService.import.and.rejectWith(new Error('Import failed'));
    beanStorage.removeByUUID.and.resolveTo(false);

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.allArgs()).toEqual([
      ['bean-created'],
    ]);
    expect(uiLog.error.calls.allArgs()).toContain([
      'Import brew from handoff link failed to roll back bean: bean-created',
    ]);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });

  it('does not remove an existing matched bean when import fails', async () => {
    brewImportService.ensureBeanFromHandoff.and.resolveTo(undefined);
    brewImportService.import.and.rejectWith(new Error('Import failed'));

    await service.handleDeepLink(url);

    expect(beanStorage.removeByUUID.calls.count()).toBe(0);
    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });
  it('reports the existing failure message when every batch brew fails', async () => {
    brewImportService.import.and.rejectWith(new Error('Import failed'));
    const batchUrl = batchHandoffUrl(
      await gzipBase64Url({ v: 1, brews: [envelope] }),
    );

    await service.handleDeepLink(batchUrl);

    expect(uiAlert.showMessage.calls.allArgs()).toContain([
      'BREW_IMPORT_FAILED',
      'ERROR_OCCURED',
      undefined,
      true,
    ]);
  });
});
