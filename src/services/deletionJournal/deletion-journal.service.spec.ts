import { TestBed } from '@angular/core/testing';

import { DELETION_JOURNAL_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { IDeletionJournalEntry } from '../../interfaces/changeTracking/iDeletionJournalEntry';
import { UILog } from '../uiLog';
import { UIStorage } from '../uiStorage';
import { DeletionJournalService } from './deletion-journal.service';

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
      .and.callFake(async (key: string) => {
        // Like a real database, answers arrive later.
        await Promise.resolve();
        if (storage.failReads) {
          throw new Error('read failed');
        }
        return structuredClone(data.get(key)) ?? null;
      }),
    set: jasmine
      .createSpy('set')
      .and.callFake(async (key: string, value: unknown) => {
        await Promise.resolve();
        if (storage.failWrites) {
          throw new Error('write failed');
        }
        data.set(key, structuredClone(value));
        return true;
      }),
  };
  return storage;
}

function createService(storage: ReturnType<typeof createStorage>) {
  const uiLog = jasmine.createSpyObj('UILog', ['log', 'info', 'error']);
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      DeletionJournalService,
      { provide: UIStorage, useValue: storage },
      { provide: UILog, useValue: uiLog },
    ],
  });
  return { service: TestBed.inject(DeletionJournalService), uiLog };
}

function note(uuid: string, collection = 'BREWS'): IDeletionJournalEntry {
  return {
    collection,
    uuid,
    deleted_at: 1_800_000_000_000,
    device_id: 'device-a',
    rev: 2,
  };
}

function stored(storage: ReturnType<typeof createStorage>) {
  return storage.data.get(DELETION_JOURNAL_STORAGE_KEY) as
    | IDeletionJournalEntry[]
    | undefined;
}

describe('DeletionJournalService', () => {
  it('adds a note and stores the journal', async () => {
    const storage = createStorage();
    const { service } = createService(storage);

    await service.record(note('brew-1'));

    expect(stored(storage)).toEqual([note('brew-1')]);
    expect(service.getEntries()).toEqual([note('brew-1')]);
  });

  it('keeps every note of parallel deletions', async () => {
    const storage = createStorage();
    const { service } = createService(storage);

    await Promise.all(
      Array.from({ length: 10 }, (_, i) => service.record(note(`brew-${i}`))),
    );

    expect(stored(storage)?.map((_note) => _note.uuid)).toEqual(
      Array.from({ length: 10 }, (_, i) => `brew-${i}`),
    );
  });

  it('reads the stored journal on the next start and adds to it', async () => {
    const storage = createStorage();
    await createService(storage).service.record(note('brew-1'));

    const { service, uiLog } = createService(storage);
    await service.initialize();
    expect(service.getEntries()).toEqual([note('brew-1')]);
    expect(uiLog.log).toHaveBeenCalledWith(
      jasmine.stringMatching(/1 notes read/),
    );

    await service.record(note('brew-2'));
    expect(stored(storage)).toEqual([note('brew-1'), note('brew-2')]);
  });

  it('reads the stored journal before the first note without initialize', async () => {
    const storage = createStorage({
      [DELETION_JOURNAL_STORAGE_KEY]: [note('old')],
    });
    const { service } = createService(storage);

    await service.record(note('new'));

    expect(stored(storage)).toEqual([note('old'), note('new')]);
  });

  it('reads only once when initialized several times', async () => {
    const storage = createStorage();
    const { service } = createService(storage);

    await Promise.all([service.initialize(), service.initialize()]);
    await service.initialize();

    expect(storage.getOrFail).toHaveBeenCalledTimes(1);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('replaces a stored value that is no list and leaves out invalid notes', async () => {
    const storage = createStorage({
      [DELETION_JOURNAL_STORAGE_KEY]: [note('ok'), { uuid: 1 }, null],
    });
    const { service } = createService(storage);
    await service.initialize();
    expect(service.getEntries()).toEqual([note('ok')]);

    const broken = createStorage({ [DELETION_JOURNAL_STORAGE_KEY]: 'text' });
    const second = createService(broken).service;
    await second.record(note('new'));
    expect(stored(broken)).toEqual([note('new')]);
  });

  it('never replaces a stored journal it could not read', async () => {
    const storage = createStorage({
      [DELETION_JOURNAL_STORAGE_KEY]: [note('old')],
    });
    storage.failReads = true;
    const { service, uiLog } = createService(storage);

    await service.initialize();
    await service.record(note('new'));

    expect(storage.set).not.toHaveBeenCalled();
    expect(stored(storage)).toEqual([note('old')]);
    expect(service.getEntries()).toEqual([note('new')]);
    expect(uiLog.error).not.toHaveBeenCalled();

    // Once the journal can be read again, the kept note is added to it.
    storage.failReads = false;
    await service.record(note('later'));
    expect(stored(storage)).toEqual([note('old'), note('new'), note('later')]);
  });

  it('reads at most once per note when the first read fails', async () => {
    const storage = createStorage();
    storage.failReads = true;
    const { service } = createService(storage);

    await service.record(note('a'));
    expect(storage.getOrFail).toHaveBeenCalledTimes(1);

    await service.record(note('b'));
    expect(storage.getOrFail).toHaveBeenCalledTimes(2);
  });

  it('keeps notes that could not be stored and writes them with the next one', async () => {
    const storage = createStorage();
    storage.failWrites = true;
    const { service, uiLog } = createService(storage);

    await expectAsync(service.record(note('a'))).toBeResolved();
    expect(storage.data.has(DELETION_JOURNAL_STORAGE_KEY)).toBeFalse();
    expect(uiLog.info).toHaveBeenCalled();
    expect(uiLog.error).not.toHaveBeenCalled();

    storage.failWrites = false;
    await service.record(note('b'));
    expect(stored(storage)).toEqual([note('a'), note('b')]);
  });

  it('copies the note so later changes of the caller do not reach it', async () => {
    const storage = createStorage();
    const { service } = createService(storage);
    const entry = note('a');

    await service.record(entry);
    entry.uuid = 'changed';

    expect(service.getEntries()[0].uuid).toBe('a');
  });

  describe('forgetExistingEntries', () => {
    it('forgets notes about entries of the collection that exist again', async () => {
      const storage = createStorage({
        [DELETION_JOURNAL_STORAGE_KEY]: [
          note('back'),
          note('gone'),
          note('back', 'BEANS'),
        ],
      });
      const { service } = createService(storage);

      const forgotten = await service.forgetExistingEntries(
        'BREWS',
        new Set(['back', 'other']),
      );

      expect(forgotten).toBe(1);
      expect(stored(storage)).toEqual([note('gone'), note('back', 'BEANS')]);
    });

    it('does not write when no note is about an existing entry', async () => {
      const storage = createStorage({
        [DELETION_JOURNAL_STORAGE_KEY]: [note('gone')],
      });
      const { service } = createService(storage);

      expect(await service.forgetExistingEntries('BREWS', new Set(['x']))).toBe(
        0,
      );
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('runs after notes that were taken before', async () => {
      const storage = createStorage();
      const { service } = createService(storage);

      const recorded = service.record(note('a'));
      const forgotten = service.forgetExistingEntries('BREWS', new Set(['a']));
      await Promise.all([recorded, forgotten]);

      expect(await forgotten).toBe(1);
      expect(stored(storage)).toEqual([]);
    });

    it('does not read again after a failed read and never writes then', async () => {
      const storage = createStorage({
        [DELETION_JOURNAL_STORAGE_KEY]: [note('a')],
      });
      storage.failReads = true;
      const { service } = createService(storage);
      await service.initialize();

      expect(await service.forgetExistingEntries('BREWS', new Set(['a']))).toBe(
        0,
      );
      expect(storage.getOrFail).toHaveBeenCalledTimes(1);
      expect(storage.set).not.toHaveBeenCalled();
    });
  });
});
