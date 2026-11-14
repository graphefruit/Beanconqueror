import { TestBed } from '@angular/core/testing';

import { Storage } from '@ionic/storage';

import { createMockUILog } from '../../test-utils';
import { EventQueueService } from '../queueService/queue-service.service';
import { UILog } from '../uiLog';
import { UIStorage } from '../uiStorage';

describe('UIStorage export', () => {
  let uiStorage: UIStorage;

  const createSettings = () => ({
    visualizer_url: 'https://visualizer.coffee/',
    visualizer_username: 'user@example.com',
    visualizer_password: 'visualizer-secret',
    cloud_ai_model: 'some-model',
    cloud_ai_api_key: 'sk-secret',
    brew_by_weight_webhook: {
      active: true,
      url: 'http://192.168.1.50/relay/0?turn=off',
      bearerToken: 'bearer-secret',
      basicUsername: 'admin',
      basicPassword: 'basic-secret',
      customHeaderName: 'X-Api-Key',
      customHeaderValue: 'header-secret',
      defaultTargetWeight: 36,
    },
  });

  const useStoredData = (data: Record<string, unknown>) => {
    (uiStorage as any)._storage = {
      forEach: (
        callback: (value: unknown, key: string, index: number) => void,
      ) => {
        Object.keys(data).forEach((key, index) =>
          callback(data[key], key, index),
        );
        return Promise.resolve();
      },
    };
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIStorage,
        { provide: Storage, useValue: { create: () => Promise.resolve({}) } },
        {
          provide: EventQueueService,
          useValue: jasmine.createSpyObj('EventQueueService', ['dispatch']),
        },
        { provide: UILog, useValue: createMockUILog() },
      ],
    });
    uiStorage = TestBed.inject(UIStorage);
  });

  it('removes all stored credentials from the exported settings', async () => {
    useStoredData({ SETTINGS: [createSettings()] });

    const exported = await uiStorage.export();
    const settings = exported.SETTINGS[0];

    expect(settings.visualizer_username).toBe('');
    expect(settings.visualizer_password).toBe('');
    expect(settings.cloud_ai_api_key).toBe('');
    expect(settings.brew_by_weight_webhook.bearerToken).toBe('');
    expect(settings.brew_by_weight_webhook.basicUsername).toBe('');
    expect(settings.brew_by_weight_webhook.basicPassword).toBe('');
    expect(settings.brew_by_weight_webhook.customHeaderValue).toBe('');
  });

  it('keeps non-secret settings in the export', async () => {
    useStoredData({ SETTINGS: [createSettings()] });

    const exported = await uiStorage.export();
    const settings = exported.SETTINGS[0];

    expect(settings.visualizer_url).toBe('https://visualizer.coffee/');
    expect(settings.cloud_ai_model).toBe('some-model');
    expect(settings.brew_by_weight_webhook.url).toBe(
      'http://192.168.1.50/relay/0?turn=off',
    );
    expect(settings.brew_by_weight_webhook.customHeaderName).toBe('X-Api-Key');
    expect(settings.brew_by_weight_webhook.defaultTargetWeight).toBe(36);
  });

  it('handles settings without a brew-by-weight webhook (older data)', async () => {
    const settings: any = createSettings();
    delete settings.brew_by_weight_webhook;
    useStoredData({ SETTINGS: [settings] });

    const exported = await uiStorage.export();

    expect(exported.SETTINGS[0].cloud_ai_api_key).toBe('');
    expect(exported.SETTINGS[0].brew_by_weight_webhook).toBeUndefined();
  });

  it('exports data without settings unchanged', async () => {
    useStoredData({ BEANS: [{ name: 'Test bean' }] });

    const exported = await uiStorage.export();

    expect(exported).toEqual({ BEANS: [{ name: 'Test bean' }] });
  });
});
