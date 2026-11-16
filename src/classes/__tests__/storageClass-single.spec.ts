import { TestBed } from '@angular/core/testing';

import { UIBeanStorage } from '../../services/uiBeanStorage';
import { MemoryDatabase } from '../../test-utils/memory-database';
import { Bean } from '../bean/bean';
import { StorageClass } from '../storageClass';

interface Entry {
  config: {
    uuid: string;
    unix_timestamp?: number;
    created_at?: number;
    updated_at?: number;
    rev?: number;
    updated_by?: string;
  };
  name?: string;
}

class NamedTestStorage extends StorageClass {
  public constructor(dbPath: string) {
    super(dbPath);
  }
}

const T0 = 1_800_000_000_000;
const UUID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

function entry(uuid: string, rev?: number, name = uuid): Entry {
  return {
    config: {
      uuid,
      unix_timestamp: 1_700_000_000,
      ...(rev === undefined ? {} : { rev, created_at: 5, updated_at: 6 }),
    },
    name,
  };
}

describe('StorageClass writing a single entry', () => {
  let db: MemoryDatabase;

  const create = <T>(factory: () => T): T =>
    TestBed.runInInjectionContext(factory);

  /** A read collection holding `entries` in memory and stored. */
  async function collection(entries: Entry[], dbPath = 'BREWS') {
    db.values.set(dbPath, structuredClone(entries));
    const storage = create(() => new NamedTestStorage(dbPath));
    await storage.initializeStorage();
    // Events and announced removals in the order they are sent.
    const sent: unknown[] = [];
    storage.attachOnEvent().subscribe((_event) => sent.push(_event));
    storage
      .attachOnRemove()
      .subscribe((_event) => sent.push({ removed: _event.id }));
    return { storage, sent };
  }

  function stored(key = 'BREWS'): Entry[] {
    return db.values.get(key) as Entry[];
  }

  beforeEach(() => {
    spyOn(Date, 'now').and.returnValue(T0);
    db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
  });

  describe('when the collection is saved', () => {
    it('add resolves a copy of the stored entry and sends one ADD naming it', async () => {
      const { storage, sent } = await collection([entry('a', 1)]);
      const given = { config: {}, name: 'new' };
      const shown = StorageClass.getMessagesShown();

      const added = await storage.add(given);

      const uuid: string = added.config.uuid;
      expect(uuid).toMatch(UUID_PATTERN);
      expect(added).toEqual({
        config: {
          uuid,
          unix_timestamp: T0 / 1000,
          created_at: T0,
          updated_at: T0,
          rev: 1,
          updated_by: 'device-a',
        },
        name: 'new',
      });
      expect(added).not.toBe(storage.getByUUID(uuid));
      expect(given.config).toEqual({});
      expect(storage.getAllEntries()).toEqual([entry('a', 1), added]);
      expect(stored()).toEqual([entry('a', 1), added]);
      expect(sent).toEqual([{ type: 'ADD', uuid }]);
      expect(db.writes('BREWS')).toBe(1);
      expect(db.journal()).toEqual([]);
      expect(StorageClass.getMessagesShown()).toBe(shown);
    });

    it('addAndConfirm resolves the same entry as saved', async () => {
      const { storage, sent } = await collection([]);

      const result = await storage.addAndConfirm(
        { config: {}, name: 'new' },
        { uuid: 'fixed', unix_timestamp: 7 },
      );

      expect(result.saved).toBeTrue();
      expect(result.entry.config.uuid).toBe('fixed');
      expect(result.entry.config.unix_timestamp).toBe(7);
      expect(stored()).toEqual([result.entry]);
      expect(sent).toEqual([{ type: 'ADD', uuid: 'fixed' }]);
    });

    it('update resolves true, counts the entry up and sends one UPDATE naming it', async () => {
      const { storage, sent } = await collection([
        entry('a', 1),
        entry('b', 2),
      ]);
      const shown = StorageClass.getMessagesShown();

      const saved = await storage.update({ ...entry('b', 2), name: 'changed' });

      const changed = {
        config: {
          uuid: 'b',
          unix_timestamp: 1_700_000_000,
          created_at: 5,
          updated_at: T0,
          rev: 3,
          updated_by: 'device-a',
        },
        name: 'changed',
      };
      expect(saved).toBeTrue();
      expect(storage.getAllEntries()).toEqual([entry('a', 1), changed]);
      expect(stored()).toEqual([entry('a', 1), changed]);
      expect(sent).toEqual([{ type: 'UPDATE', uuid: 'b' }]);
      expect(db.writes('BREWS')).toBe(1);
      expect(db.journal()).toEqual([]);
      expect(StorageClass.getMessagesShown()).toBe(shown);
    });

    it('update without touch keeps the change info and sends the same event', async () => {
      const { storage, sent } = await collection([entry('a', 4)]);

      const saved = await storage.update(
        { ...entry('a', 9), name: 'changed' },
        { touch: false },
      );

      expect(saved).toBeTrue();
      expect(stored()).toEqual([entry('a', 4, 'changed')]);
      expect(sent).toEqual([{ type: 'UPDATE', uuid: 'a' }]);
    });

    for (const [name, remove] of [
      ['removeByUUID', (s: StorageClass) => s.removeByUUID('b')],
      ['removeByObject', (s: StorageClass) => s.removeByObject(entry('b'))],
    ] as const) {
      it(`${name} resolves true, announces the entry, sends DELETE and notes the deletion`, async () => {
        const { storage, sent } = await collection([
          entry('a', 1),
          entry('b', 7),
          entry('c', 1),
        ]);
        const shown = StorageClass.getMessagesShown();

        const saved = await remove(storage);

        expect(saved).toBeTrue();
        expect(storage.getAllEntries()).toEqual([entry('a', 1), entry('c', 1)]);
        expect(stored()).toEqual([entry('a', 1), entry('c', 1)]);
        expect(sent).toEqual([{ removed: 'b' }, { type: 'DELETE' }]);
        expect(db.writes('BREWS')).toBe(1);
        expect(db.journal()).toEqual([
          jasmine.objectContaining({
            collection: 'BREWS',
            uuid: 'b',
            rev: 7,
            deleted_at: T0,
            device_id: 'device-a',
          }),
        ]);
        expect(StorageClass.getMessagesShown()).toBe(shown);
      });
    }
  });

  describe('when the collection cannot be saved', () => {
    const entries = () => [entry('a', 1), entry('b', 2), entry('c', 3)];

    /** The collection with its list and entries as they were before. */
    async function failing() {
      const { storage, sent } = await collection(entries());
      const list = storage.getAllEntries();
      const kept = [...list];
      db.failingWrites.add('BREWS');
      const shown = StorageClass.getMessagesShown();
      const expectAsBefore = () => {
        // The same entries at the same places of the same list.
        expect(storage.getAllEntries()).toBe(list);
        expect(list.length).toBe(3);
        expect(list.every((_entry, i) => _entry === kept[i])).toBeTrue();
        expect(list).toEqual(entries());
        expect(stored()).toEqual(entries());
        // Lets the typed storages drop their cached objects.
        expect(sent).toEqual([{ type: 'UPDATE' }]);
        expect(StorageClass.getMessagesShown() - shown).toBe(1);
        expect(db.journal()).toEqual([]);
      };
      return { storage, expectAsBefore };
    }

    /** The next save of the collection stores nothing of the failed write. */
    async function expectNextSaveWithout(storage: StorageClass) {
      db.failingWrites.clear();
      expect(await storage.update({ ...entry('a', 1), name: 'next' })).toBe(
        true,
      );
      expect(stored().map((_entry) => _entry.name)).toEqual(['next', 'b', 'c']);
    }

    it('addAndConfirm leaves no entry behind', async () => {
      const { storage, expectAsBefore } = await failing();

      const result = await storage.addAndConfirm({ config: {}, name: 'new' });

      expect(result.saved).toBeFalse();
      expect(result.entry.config.uuid).toMatch(UUID_PATTERN);
      expect(result.entry.name).toBe('new');
      expect(storage.getByUUID(result.entry.config.uuid)).toBeUndefined();
      expectAsBefore();
      await expectNextSaveWithout(storage);
    });

    it('add leaves no entry behind and still resolves an entry with a uuid', async () => {
      const { storage, expectAsBefore } = await failing();

      const added = await storage.add({ config: {}, name: 'new' });

      expect(added.config.uuid).toMatch(UUID_PATTERN);
      expectAsBefore();
    });

    it('update puts the entry from before back', async () => {
      const { storage, expectAsBefore } = await failing();

      const saved = await storage.update({ ...entry('b', 2), name: 'changed' });

      expect(saved).toBeFalse();
      expect(storage.getByUUID('b').name).toBe('b');
      expectAsBefore();
      await expectNextSaveWithout(storage);
    });

    it('update without touch puts the entry from before back', async () => {
      const { storage, expectAsBefore } = await failing();

      const saved = await storage.update(
        { ...entry('b', 2), name: 'changed' },
        { touch: false },
      );

      expect(saved).toBeFalse();
      expectAsBefore();
    });

    it('does not count a typed bean up whose update failed', async () => {
      const beans = create(() => new UIBeanStorage());
      await beans.initializeStorage();
      const added = await beans.add(new Bean());
      const typed = beans.getEntryByUUID(added.config.uuid);
      typed.name = 'changed';
      db.failingWrites.add('BEANS');

      expect(await beans.update(typed)).toBeFalse();

      const raw = beans.getRawEntries()[0] as Bean;
      expect(raw.config.rev).toBe(1);
      expect(raw.name).toBe('');
      expect(beans.getEntryByUUID(added.config.uuid).name).toBe('');
    });

    for (const [name, remove] of [
      ['removeByUUID', (s: StorageClass) => s.removeByUUID('b')],
      ['removeByObject', (s: StorageClass) => s.removeByObject(entry('b'))],
    ] as const) {
      it(`${name} puts the entry back at its place and announces nothing`, async () => {
        const { storage, expectAsBefore } = await failing();

        const saved = await remove(storage);

        expect(saved).toBeFalse();
        expect(storage.getByUUID('b').name).toBe('b');
        expectAsBefore();
        await expectNextSaveWithout(storage);
      });
    }

    it('keeps an entry that another write added during the failing save', async () => {
      for (const write of [
        (s: StorageClass) => s.add({ config: {}, name: 'new' }),
        (s: StorageClass) => s.update({ ...entry('b', 2), name: 'changed' }),
        (s: StorageClass) => s.removeByUUID('b'),
      ]) {
        const { storage } = await collection(entries());
        let fail = true;
        db.set.and.callFake(async (key: string, value: unknown) => {
          if (key === 'BREWS' && fail) {
            fail = false;
            await storage.add(entry('other'));
            return false;
          }
          db.values.set(key, structuredClone(value));
          return true;
        });

        await write(storage);

        expect(
          storage.getAllEntries().map((_entry: Entry) => _entry.name),
        ).toEqual(['a', 'b', 'c', 'other']);
      }
    });

    it('puts nothing into entries that were read anew during the failing save', async () => {
      for (const write of [
        (s: StorageClass) => s.add({ config: {}, name: 'new' }),
        (s: StorageClass) => s.update({ ...entry('b', 2), name: 'changed' }),
        (s: StorageClass) => s.removeByUUID('b'),
      ]) {
        const { storage, sent } = await collection(entries());
        db.set.and.callFake(async (key: string) => {
          if (key === 'BREWS') {
            db.values.set('BREWS', [entry('read', 1)]);
            await storage.reinitializeStorage();
            return false;
          }
          return true;
        });

        await write(storage);

        expect(storage.getAllEntries()).toEqual([entry('read', 1)]);
        expect(sent).toEqual([{ type: 'REINITIALIZE' }]);
      }
    });
  });
});
