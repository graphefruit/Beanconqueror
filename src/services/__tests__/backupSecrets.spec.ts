import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage';

import { WEBHOOK_AUTH_TYPE_ENUM } from '../../enums/settings/webhookAuthType';
import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

function settingsWithSecrets(prefix: string) {
  return {
    language: 'de',
    currency: 'CHF',
    visualizer_active: true,
    visualizer_url: 'https://visualizer.coffee/',
    visualizer_username: `${prefix}-visualizer-user`,
    visualizer_password: `${prefix}-visualizer-password`,
    cloud_ai_api_key: `${prefix}-ai-key`,
    cloud_ai_model: 'some-model',
    cloud_ai_base_url: 'https://ai.example.com',
    brew_by_weight_webhook: {
      active: true,
      url: 'https://webhook.example.com/stop',
      authType: WEBHOOK_AUTH_TYPE_ENUM.BASIC,
      bearerToken: `${prefix}-bearer`,
      basicUsername: `${prefix}-basic-user`,
      basicPassword: `${prefix}-basic-password`,
      customHeaderName: 'X-Api-Key',
      customHeaderValue: `${prefix}-header-value`,
      defaultTargetWeight: 36,
      predictiveMode: true,
      learnedLagTime: 0.7,
    },
  };
}

function withEmptySecrets(settings: ReturnType<typeof settingsWithSecrets>) {
  return {
    ...settings,
    visualizer_username: '',
    visualizer_password: '',
    cloud_ai_api_key: '',
    brew_by_weight_webhook: {
      ...settings.brew_by_weight_webhook,
      bearerToken: '',
      basicUsername: '',
      basicPassword: '',
      customHeaderValue: '',
    },
  };
}

/** Behaves like IndexedDB: values are copied when written and read. */
function createDeviceDatabase(initial: Record<string, unknown>) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  return {
    data,
    database: {
      set: (key: string, value: unknown) => {
        data.set(key, structuredClone(value));
        return Promise.resolve();
      },
      get: (key: string) => Promise.resolve(structuredClone(data.get(key))),
      forEach: (cb: (value: unknown, key: string, i: number) => void) => {
        let i = 0;
        for (const [key, value] of data) {
          cb(structuredClone(value), key, i++);
        }
        return Promise.resolve();
      },
    },
  };
}

function configure(storage: object) {
  TestBed.configureTestingModule({
    providers: [
      UIExportImportHelper,
      UIStorage,
      {
        provide: Storage,
        useValue: { create: () => Promise.resolve(storage) },
      },
      { provide: EventQueueService, useValue: { dispatch: () => undefined } },
      {
        provide: UIHelper,
        useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
      },
      { provide: Platform, useValue: { is: () => false } },
      {
        provide: UILog,
        useValue: {
          log: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        },
      },
      { provide: UISettingsStorage, useValue: {} },
      { provide: UIFileHelper, useValue: {} },
      { provide: UIAlert, useValue: {} },
      { provide: UIBrewStorage, useValue: {} },
      { provide: ModalController, useValue: {} },
    ],
  });
}

async function readBackup(
  helper: UIExportImportHelper,
  zip: Blob,
): Promise<any> {
  return await helper.getJSONFromZIPArrayBufferContent(await zip.arrayBuffer());
}

describe('Backup and export without credentials', () => {
  it('writes no credentials into the backup and leaves the live settings untouched', async () => {
    const liveSettings = settingsWithSecrets('device');
    const liveData = { SETTINGS: [liveSettings], BREWS: [] };
    // The export source is handed out without copying, so any change to it
    // would show up on the live object.
    configure({});
    TestBed.overrideProvider(UIStorage, {
      useValue: { export: () => Promise.resolve(liveData) },
    });
    const helper = TestBed.inject(UIExportImportHelper);

    const restored = await readBackup(helper, await helper.buildExportZIP());

    const exported = restored.SETTINGS[0];
    expect(exported.visualizer_username).toBe('');
    expect(exported.visualizer_password).toBe('');
    expect(exported.cloud_ai_api_key).toBe('');
    expect(exported.brew_by_weight_webhook.bearerToken).toBe('');
    expect(exported.brew_by_weight_webhook.basicUsername).toBe('');
    expect(exported.brew_by_weight_webhook.basicPassword).toBe('');
    expect(exported.brew_by_weight_webhook.customHeaderValue).toBe('');
    expect(JSON.stringify(restored)).not.toContain('device-');

    // Every other setting survives the round trip unchanged.
    expect(exported).toEqual(withEmptySecrets(settingsWithSecrets('device')));
    expect(liveSettings).toEqual(settingsWithSecrets('device'));
  });

  it('keeps the credentials of the device when the backup has none', async () => {
    const device = createDeviceDatabase({
      SETTINGS: [settingsWithSecrets('device')],
    });
    configure(device.database);
    const uiStorage = TestBed.inject(UIStorage);
    await uiStorage.init();

    const backup = withEmptySecrets(settingsWithSecrets('device'));
    backup.language = 'en';
    backup.brew_by_weight_webhook.url = 'https://other.example.com';
    const result = await uiStorage.import({ SETTINGS: [backup], BREWS: [] });

    expect(result).toEqual({ BACKUP: false });
    const stored = (device.data.get('SETTINGS') as any[])[0];
    expect(stored).toEqual({
      ...settingsWithSecrets('device'),
      language: 'en',
      brew_by_weight_webhook: {
        ...settingsWithSecrets('device').brew_by_weight_webhook,
        url: 'https://other.example.com',
      },
    });
  });

  it('still takes over the credentials contained in an older backup', async () => {
    const device = createDeviceDatabase({
      SETTINGS: [settingsWithSecrets('device')],
    });
    configure(device.database);
    const uiStorage = TestBed.inject(UIStorage);
    await uiStorage.init();

    await uiStorage.import({ SETTINGS: [settingsWithSecrets('old-backup')] });

    expect((device.data.get('SETTINGS') as any[])[0]).toEqual(
      settingsWithSecrets('old-backup'),
    );
  });

  it('moves all other settings to a new device and keeps its credentials', async () => {
    const oldDevice = createDeviceDatabase({
      SETTINGS: [settingsWithSecrets('old')],
      BREWS: [{ config: { uuid: 'brew-1' } }],
    });
    configure(oldDevice.database);
    const oldStorage = TestBed.inject(UIStorage);
    await oldStorage.init();
    const zip = await TestBed.inject(UIExportImportHelper).buildExportZIP();

    TestBed.resetTestingModule();
    const newDevice = createDeviceDatabase({
      SETTINGS: [settingsWithSecrets('new')],
    });
    configure(newDevice.database);
    const helper = TestBed.inject(UIExportImportHelper);
    const newStorage = TestBed.inject(UIStorage);
    await newStorage.init();
    await newStorage.import(await readBackup(helper, zip));

    const expected = settingsWithSecrets('old');
    const fromNewDevice = settingsWithSecrets('new');
    expect((newDevice.data.get('SETTINGS') as any[])[0]).toEqual({
      ...expected,
      visualizer_username: fromNewDevice.visualizer_username,
      visualizer_password: fromNewDevice.visualizer_password,
      cloud_ai_api_key: fromNewDevice.cloud_ai_api_key,
      brew_by_weight_webhook: {
        ...expected.brew_by_weight_webhook,
        bearerToken: fromNewDevice.brew_by_weight_webhook.bearerToken,
        basicUsername: fromNewDevice.brew_by_weight_webhook.basicUsername,
        basicPassword: fromNewDevice.brew_by_weight_webhook.basicPassword,
        customHeaderValue:
          fromNewDevice.brew_by_weight_webhook.customHeaderValue,
      },
    });
    expect(newDevice.data.get('BREWS')).toEqual([
      { config: { uuid: 'brew-1' } },
    ]);
    // The old device itself still holds its credentials.
    expect((oldDevice.data.get('SETTINGS') as any[])[0]).toEqual(
      settingsWithSecrets('old'),
    );
  });
});
