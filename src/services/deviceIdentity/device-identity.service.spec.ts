import { TestBed } from '@angular/core/testing';

import { DEVICE_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { UILog } from '../uiLog';
import { UIStorage } from '../uiStorage';
import { DeviceIdentityService } from './device-identity.service';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Stands in for UIStorage; values are copied like IndexedDB does. */
function createStorage(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  const storage = {
    data,
    failReads: false,
    failWrites: false,
    getOrFail: jasmine
      .createSpy('getOrFail')
      .and.callFake((key: string) =>
        storage.failReads
          ? Promise.reject(new Error('read failed'))
          : Promise.resolve(structuredClone(data.get(key)) ?? null),
      ),
    set: jasmine
      .createSpy('set')
      .and.callFake((key: string, value: unknown) => {
        if (storage.failWrites) {
          return Promise.reject(new Error('write failed'));
        }
        data.set(key, structuredClone(value));
        return Promise.resolve(true);
      }),
  };
  return storage;
}

function createService(
  storage: ReturnType<typeof createStorage>,
): DeviceIdentityService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      DeviceIdentityService,
      { provide: UIStorage, useValue: storage },
      {
        provide: UILog,
        useValue: { log: () => undefined, info: () => undefined },
      },
    ],
  });
  return TestBed.inject(DeviceIdentityService);
}

describe('DeviceIdentityService', () => {
  it('has no device id before it is initialized', () => {
    const service = createService(createStorage());

    expect(service.getDeviceId()).toBe('');
  });

  it('creates and stores a device id on the first start', async () => {
    const storage = createStorage();
    const service = createService(storage);
    const before = Date.now();

    await service.initialize();

    const stored = storage.data.get(DEVICE_STORAGE_KEY) as any;
    expect(service.getDeviceId()).toMatch(UUID_V4);
    expect(stored.device_id).toBe(service.getDeviceId());
    expect(stored.created_at).toBeGreaterThanOrEqual(before);
    expect(stored.created_at).toBeLessThanOrEqual(Date.now());
  });

  it('keeps the same device id on the next start', async () => {
    const storage = createStorage();
    const firstStart = createService(storage);
    await firstStart.initialize();
    const stored = structuredClone(storage.data.get(DEVICE_STORAGE_KEY));

    const secondStart = createService(storage);
    await secondStart.initialize();

    expect(secondStart.getDeviceId()).toBe(firstStart.getDeviceId());
    expect(storage.data.get(DEVICE_STORAGE_KEY)).toEqual(stored);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });

  it('only reads and writes once when initialized several times', async () => {
    const storage = createStorage();
    const service = createService(storage);

    await Promise.all([service.initialize(), service.initialize()]);
    const deviceId = service.getDeviceId();
    await service.initialize();

    expect(service.getDeviceId()).toBe(deviceId);
    expect(storage.getOrFail).toHaveBeenCalledTimes(1);
    expect(storage.set).toHaveBeenCalledTimes(1);
  });

  for (const [label, value] of [
    ['an empty device id', { device_id: '', created_at: 1 }],
    ['a device id that is no string', { device_id: 42, created_at: 1 }],
    ['no object', 'not-an-object'],
  ] as [string, unknown][]) {
    it(`replaces a stored value with ${label}`, async () => {
      const storage = createStorage({ [DEVICE_STORAGE_KEY]: value });
      const service = createService(storage);

      await service.initialize();

      expect(service.getDeviceId()).toMatch(UUID_V4);
      expect((storage.data.get(DEVICE_STORAGE_KEY) as any).device_id).toBe(
        service.getDeviceId(),
      );
    });
  }

  it('never overwrites a stored device id it could not read', async () => {
    const existing = { device_id: 'existing-id', created_at: 1 };
    const storage = createStorage({ [DEVICE_STORAGE_KEY]: existing });
    storage.failReads = true;
    const service = createService(storage);

    await service.initialize();

    // A temporary id is used for this session only.
    expect(service.getDeviceId()).toMatch(UUID_V4);
    expect(storage.set).not.toHaveBeenCalled();
    expect(storage.data.get(DEVICE_STORAGE_KEY)).toEqual(existing);
  });

  it('keeps the new device id for the session when it cannot be stored', async () => {
    const storage = createStorage();
    storage.failWrites = true;
    const service = createService(storage);

    await service.initialize();

    expect(service.getDeviceId()).toMatch(UUID_V4);
    expect(storage.data.has(DEVICE_STORAGE_KEY)).toBeFalse();
  });
});
