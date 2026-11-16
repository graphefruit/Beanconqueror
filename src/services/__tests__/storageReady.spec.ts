import { TestBed } from '@angular/core/testing';

import { UIBrewStorage } from '../uiBrewStorage';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';
import { UiVersionStorage } from '../uiVersionStorage';

/** Stands in for UIStorage; a read waits while `holdReads` is set. */
function createStorage(initial: Record<string, unknown> = {}) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(initial)),
  );
  let release: () => void = () => undefined;
  const storage = {
    data,
    failingReads: new Set<string>(),
    holdReads: false,
    releaseReads: () => {
      storage.holdReads = false;
      release();
    },
    get: (key: string) =>
      Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
    getOrFail: async (key: string) => {
      if (storage.holdReads) {
        await new Promise<void>((resolve) => (release = resolve));
      }
      if (storage.failingReads.has(key)) {
        throw new Error('read failed');
      }
      return data.has(key) ? structuredClone(data.get(key)) : null;
    },
    set: (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
      return Promise.resolve(true);
    },
  };
  return storage;
}

/** Lets everything run that needs no timer. */
async function withoutTimers(): Promise<void> {
  for (let i = 0; i < 50; i++) {
    await Promise.resolve();
  }
}

function outcomeOf(promise: Promise<unknown>) {
  const outcome = { state: 'pending' };
  promise.then(
    () => (outcome.state = 'resolved'),
    () => (outcome.state = 'rejected'),
  );
  return outcome;
}

describe('storageReady() of the collections', () => {
  let storage: ReturnType<typeof createStorage>;
  let log: string[];
  let polling: jasmine.Spy;

  function start(initial: Record<string, unknown> = {}) {
    storage = createStorage(initial);
    log = [];
    polling = spyOn(window, 'setInterval').and.callThrough();
    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: storage },
        {
          provide: UILog,
          useValue: {
            log: (line: string) => log.push(line),
            info: () => undefined,
            error: () => undefined,
          },
        },
      ],
    });
  }

  const readyLines = (collection: string) =>
    log.filter(
      (line) =>
        line.startsWith(`Storage ${collection}`) && line.includes('ready'),
    );

  describe('a collection', () => {
    it('lets a caller from before the read go on as soon as it is read, without polling', async () => {
      start({ BREWS: [{ config: { uuid: 'b' } }] });
      const brews = TestBed.inject(UIBrewStorage);
      const ready = outcomeOf(brews.storageReady());
      await withoutTimers();
      expect(ready.state).toBe('pending');

      await brews.initializeStorage();
      await withoutTimers();

      expect(ready.state).toBe('resolved');
      expect(brews.getRawEntries().length).toBe(1);
      expect(readyLines('BREWS')).toEqual(['Storage BREWS ready']);
      expect(polling).not.toHaveBeenCalled();
    });

    it('answers at once when it was read before', async () => {
      start();
      const brews = TestBed.inject(UIBrewStorage);
      await brews.initializeStorage();

      await expectAsync(brews.storageReady()).toBeResolved();

      expect(readyLines('BREWS')).toEqual(['Storage BREWS - already - ready']);
      expect(polling).not.toHaveBeenCalled();
    });

    it('rejects for callers from before and after a read that failed', async () => {
      start();
      storage.failingReads.add('BREWS');
      const brews = TestBed.inject(UIBrewStorage);
      const before = outcomeOf(brews.storageReady());

      await brews.initializeStorage().catch(() => undefined);
      await withoutTimers();

      expect(before.state).toBe('rejected');
      await expectAsync(brews.storageReady()).toBeRejectedWith(undefined);
      expect(readyLines('BREWS')).toEqual([
        'Storage BREWS not ready',
        'Storage BREWS - already not - ready',
      ]);
      expect(polling).not.toHaveBeenCalled();
    });

    it('makes a caller wait for the read that is running when it is read again', async () => {
      start();
      const brews = TestBed.inject(UIBrewStorage);
      await brews.initializeStorage();
      storage.data.set('BREWS', [{ config: { uuid: 'imported' } }]);
      storage.holdReads = true;

      const reading = brews.reinitializeStorage();
      const ready = outcomeOf(brews.storageReady());
      await withoutTimers();
      expect(ready.state).toBe('pending');

      storage.releaseReads();
      await reading;
      await withoutTimers();

      expect(ready.state).toBe('resolved');
      expect(brews.getRawEntries().length).toBe(1);
    });
  });

  for (const { name, collection, uuid } of [
    {
      name: 'SETTINGS',
      collection: (): UISettingsStorage | UiVersionStorage =>
        TestBed.inject(UISettingsStorage),
      uuid: () => TestBed.inject(UISettingsStorage).getSettings().config.uuid,
    },
    {
      name: 'VERSION',
      collection: (): UISettingsStorage | UiVersionStorage =>
        TestBed.inject(UiVersionStorage),
      uuid: () => TestBed.inject(UiVersionStorage).getVersion().config.uuid,
    },
  ]) {
    describe(name, () => {
      it('is ready once its stored entry is taken over, without polling', async () => {
        start({ [name]: [{ config: { uuid: 'stored', unix_timestamp: 1 } }] });
        const instance = collection();
        const ready = outcomeOf(instance.storageReady());
        await withoutTimers();
        expect(ready.state).toBe('pending');

        await instance.initializeStorage();
        await withoutTimers();

        expect(ready.state).toBe('resolved');
        expect(uuid()).toBe('stored');
        expect(readyLines(name)).toEqual([
          `Storage ${name} ready`,
          `Storage ${name} ready`,
        ]);
        await expectAsync(instance.storageReady()).toBeResolved();
        expect(readyLines(name)[2]).toBe(`Storage ${name} - already - ready`);
        expect(polling).not.toHaveBeenCalled();
      });

      it('is ready only after a missing entry was created and stored', async () => {
        start();
        const instance = collection();
        const ready = instance.storageReady().then(() => ({
          stored: structuredClone(storage.data.get(name)) as {
            config: { uuid: string };
          }[],
        }));

        await instance.initializeStorage();
        const { stored } = await ready;

        expect(stored.length).toBe(1);
        expect(uuid()).toBe(stored[0].config.uuid);
        expect(polling).not.toHaveBeenCalled();
      });

      it('rejects when it could not be read', async () => {
        start();
        storage.failingReads.add(name);
        const instance = collection();
        const before = outcomeOf(instance.storageReady());

        await instance.initializeStorage().catch(() => undefined);
        await withoutTimers();

        expect(before.state).toBe('rejected');
        await expectAsync(instance.storageReady()).toBeRejectedWith(undefined);
        expect(readyLines(name)).toEqual([
          `Storage ${name} not ready`,
          `Storage ${name} not ready`,
          `Storage ${name} - already - not - ready`,
        ]);
        expect(polling).not.toHaveBeenCalled();
      });
    });
  }
});
