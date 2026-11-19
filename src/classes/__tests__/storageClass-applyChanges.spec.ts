import { TestBed } from '@angular/core/testing';

import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { MemoryDatabase, uuidsOf } from '../../test-utils/memory-database';
import { Bean } from '../bean/bean';
import { Brew } from '../brew/brew';
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
  /** Names whose entries cannot be prepared for storage. */
  public unpreparable: string[] = [];

  public constructor(dbPath: string) {
    super(dbPath);
  }

  protected override prepareEntryForStorage(_entry: Entry): Entry {
    if (this.unpreparable.includes(_entry.name)) {
      throw new Error('prepare failed');
    }
    return _entry;
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

describe('StorageClass writing several entries with one save', () => {
  let db: MemoryDatabase;
  let now: number;

  const create = <T>(factory: () => T): T =>
    TestBed.runInInjectionContext(factory);

  /** A read collection holding `entries` in memory and stored. */
  async function collection(entries: Entry[], dbPath = 'BREWS') {
    db.values.set(dbPath, structuredClone(entries));
    const storage = create(() => new NamedTestStorage(dbPath));
    await storage.initializeStorage();
    const events: unknown[] = [];
    const removed: string[] = [];
    storage.attachOnEvent().subscribe((_event) => events.push(_event));
    storage.attachOnRemove().subscribe((_event) => removed.push(_event.id));
    return { storage, events, removed };
  }

  function stored(key = 'BREWS'): Entry[] {
    return db.values.get(key) as Entry[];
  }

  function failWrites(of = 'BREWS'): void {
    db.failingWrites.add(of);
  }

  beforeEach(() => {
    now = T0;
    spyOn(Date, 'now').and.callFake(() => now);
    db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
  });

  describe('updateMany', () => {
    it('replaces 300 entries with one save and one event naming them', async () => {
      const entries = Array.from({ length: 300 }, (_, i) =>
        entry(`brew-${i}`, i % 4),
      );
      const { storage, events, removed } = await collection([
        entry('first', 1),
        ...entries,
        entry('last', 1),
      ]);
      expect(storage.getByUUID('brew-7').name).toBe('brew-7');
      now = T0 + 1000;

      const saved = await storage.updateMany(
        entries.map((_entry) => ({ ..._entry, name: 'changed' })).reverse(),
      );

      expect(saved).toBeTrue();
      expect(db.writes('BREWS')).toBe(1);
      expect(events).toEqual([
        { type: 'UPDATE', uuids: uuidsOf(entries).reverse() },
      ]);
      expect(removed).toEqual([]);
      expect(db.journal()).toEqual([]);
      expect(stored().map((_entry) => _entry.name)).toEqual([
        'first',
        ...entries.map(() => 'changed'),
        'last',
      ]);
      expect(stored()).toEqual(storage.getAllEntries());
      expect(storage.getByUUID('brew-7').name).toBe('changed');
      expect(stored()[0].config).toEqual(entry('first', 1).config);
    });

    it('gives every entry the change info a single update gives it', async () => {
      const entries = () => [
        entry('legacy'),
        entry('tracked', 3),
        // The caller holds an entry that is older than the stored one.
        entry('outdated', 9),
      ];
      const changes = () => [
        { ...entry('tracked', 3), name: 'b' },
        { ...entry('outdated', 2), name: 'c' },
        { ...entry('legacy'), name: 'a' },
      ];
      const together = await collection(entries());
      const single = await collection(entries(), 'MILL');
      now = T0 + 1000;

      expect(await together.storage.updateMany(changes())).toBeTrue();
      for (const change of changes()) {
        await single.storage.update(change);
      }

      expect(stored()).toEqual(stored('MILL'));
      expect(stored().map((_entry) => _entry.config)).toEqual([
        {
          uuid: 'legacy',
          unix_timestamp: 1_700_000_000,
          created_at: 1_700_000_000_000,
          updated_at: T0 + 1000,
          rev: 1,
          updated_by: 'device-a',
        },
        {
          uuid: 'tracked',
          unix_timestamp: 1_700_000_000,
          created_at: 5,
          updated_at: T0 + 1000,
          rev: 4,
          updated_by: 'device-a',
        },
        {
          uuid: 'outdated',
          unix_timestamp: 1_700_000_000,
          created_at: 5,
          updated_at: T0 + 1000,
          rev: 10,
          updated_by: 'device-a',
        },
      ]);
      expect(db.writes('BREWS')).toBe(1);
      expect(db.writes('MILL')).toBe(3);
    });

    it('stores typed brews and beans like a single update does', async () => {
      const brews = create(() => new UIBrewStorage());
      const beans = create(() => new UIBeanStorage());
      await brews.initializeStorage();
      await beans.initializeStorage();
      const brew = await brews.add(new Brew());
      const bean = await beans.add(new Bean());
      const typedBrew = brews.getEntryByUUID(brew.config.uuid);
      const typedBean = beans.getEntryByUUID(bean.config.uuid);
      // Text from an input, as the single update turns into numbers.
      typedBrew.grind_weight = '18.5' as unknown as number;
      typedBean.weight = '250' as unknown as number;
      now = T0 + 1000;

      expect(await brews.updateMany([typedBrew])).toBeTrue();
      expect(await beans.updateMany([typedBean])).toBeTrue();

      const storedBrew = brews.getRawEntries()[0] as Brew;
      const storedBean = beans.getRawEntries()[0] as Bean;
      expect(storedBrew.grind_weight).toBe(18.5);
      expect(storedBean.weight).toBe(250);
      expect(storedBrew.config.rev).toBe(2);
      // The typed bean shares its config with the stored entry: counted
      // once, and the stored entry is apart from the caller's object.
      expect(storedBean.config.rev).toBe(2);
      expect(storedBean).not.toBe(typedBean);
      typedBean.config.rev = 99;
      expect((beans.getRawEntries()[0] as Bean).config.rev).toBe(2);
    });

    it('replaces an entry each time it is in the list, as updating one by one does', async () => {
      const { storage, events } = await collection([
        entry('a', 1),
        entry('twin', 1, 'first'),
        entry('twin', 1, 'second'),
      ]);

      const saved = await storage.updateMany([
        { ...entry('twin', 1), name: 'once' },
        { ...entry('a', 1), name: 'a changed' },
        { ...entry('twin', 1), name: 'twice' },
      ]);

      expect(saved).toBeTrue();
      expect(db.writes('BREWS')).toBe(1);
      // The first stored entry of a shared uuid is the one replaced.
      expect(stored().map((_entry) => _entry.name)).toEqual([
        'a changed',
        'twice',
        'second',
      ]);
      expect(stored().map((_entry) => _entry.config.rev)).toEqual([2, 3, 1]);
      expect(events).toEqual([{ type: 'UPDATE', uuids: ['twin', 'a'] }]);
    });

    it('changes nothing when one of the entries is not stored', async () => {
      const { storage, events } = await collection([entry('a', 1)]);
      const before = storage.getAllEntries()[0];

      const saved = await storage.updateMany([
        { ...entry('a', 1), name: 'changed' },
        entry('unknown'),
      ]);

      expect(saved).toBeFalse();
      expect(storage.getAllEntries()).toEqual([entry('a', 1)]);
      expect(storage.getAllEntries()[0]).toBe(before);
      expect(db.writes('BREWS')).toBe(0);
      expect(events).toEqual([]);
    });

    it('changes nothing when one of the entries cannot be prepared', async () => {
      const { storage, events } = await collection([
        entry('a', 1),
        entry('b', 1),
      ]);
      storage.unpreparable = ['broken'];

      const saved = await storage.updateMany([
        { ...entry('a', 1), name: 'changed' },
        { ...entry('b', 1), name: 'broken' },
      ]);

      expect(saved).toBeFalse();
      expect(storage.getAllEntries()).toEqual([entry('a', 1), entry('b', 1)]);
      expect(db.writes('BREWS')).toBe(0);
      expect(events).toEqual([]);
    });

    it('puts the entries back when the save fails', async () => {
      const entries = () => [entry('a', 1), entry('b', 2), entry('c', 3)];
      const { storage, events } = await collection(entries());
      const list = storage.getAllEntries();
      const kept = [...list];
      expect(storage.getByUUID('c')).toBe(kept[2]);
      failWrites();
      const shown = StorageClass.getMessagesShown();

      const saved = await storage.updateMany([
        { ...entry('c', 3), name: 'changed' },
        { ...entry('a', 1), name: 'changed' },
      ]);

      expect(saved).toBeFalse();
      // The same entries at the same places of the same list.
      expect(storage.getAllEntries()).toBe(list);
      expect(list.length).toBe(3);
      expect(list.every((_entry, i) => _entry === kept[i])).toBeTrue();
      expect(list).toEqual(entries());
      expect(storage.getByUUID('c')).toBe(kept[2]);
      expect(stored()).toEqual(entries());
      // Lets the typed storages drop their cached objects.
      expect(events).toEqual([{ type: 'UPDATE' }]);
      expect(StorageClass.getMessagesShown() - shown).toBe(1);
    });

    it('does not count a typed bean up whose save failed', async () => {
      const beans = create(() => new UIBeanStorage());
      await beans.initializeStorage();
      const added = await beans.add(new Bean());
      const typed = beans.getEntryByUUID(added.config.uuid);
      typed.name = 'changed';
      failWrites('BEANS');

      expect(await beans.updateMany([typed])).toBeFalse();

      const raw = beans.getRawEntries()[0] as Bean;
      expect(raw.config.rev).toBe(1);
      expect(raw.name).toBe('');
      expect(beans.getEntryByUUID(added.config.uuid).name).toBe('');
    });

    it('is taken back before an add started during the failing save is stored', async () => {
      const { storage } = await collection([entry('a', 1), entry('b', 1)]);
      let failing = true;
      let added: Promise<unknown>;
      db.set.and.callFake(async (key: string, value: unknown) => {
        if (key === 'BREWS' && failing) {
          failing = false;
          added = storage.add(entry('ignored'));
          return false;
        }
        db.values.set(key, structuredClone(value));
        return true;
      });

      const saved = await storage.updateMany([
        { ...entry('a', 1), name: 'changed' },
      ]);
      await added;

      expect(saved).toBeFalse();
      expect(
        storage.getAllEntries().map((_entry: Entry) => _entry.name),
      ).toEqual(['a', 'b', 'ignored']);
      expect(stored()).toEqual(storage.getAllEntries());
    });

    it('sets no change info in collections without change tracking', async () => {
      const { storage } = await collection([entry('a')], 'TEST_DB');

      const saved = await storage.updateMany([
        { ...entry('a'), name: 'changed' },
      ]);

      expect(saved).toBeTrue();
      expect(stored('TEST_DB')).toEqual([{ ...entry('a'), name: 'changed' }]);
    });
  });

  describe('addMany', () => {
    it('adds 60 entries with one save and one event naming them', async () => {
      const { storage, events } = await collection([entry('there', 1)]);
      const copies = Array.from({ length: 60 }, (_, i): Entry => ({
        // Copied from another entry: nothing of it is kept.
        config: { uuid: 'copied', unix_timestamp: 5, rev: 7, created_at: 5 },
        name: `bag-${i}`,
      }));

      const result = await storage.addMany(copies);

      expect(result.saved).toBeTrue();
      expect(db.writes('BREWS')).toBe(1);
      expect(result.added.map((_entry) => _entry.name)).toEqual(
        copies.map((_entry) => _entry.name),
      );
      const uuids = uuidsOf(result.added);
      expect(new Set(uuids).size).toBe(60);
      expect(uuids.every((_uuid) => UUID_PATTERN.test(_uuid))).toBeTrue();
      expect(events).toEqual([{ type: 'ADD', uuids }]);
      expect(stored().slice(1)).toEqual(result.added);
      for (const added of result.added) {
        expect(added.config).toEqual({
          uuid: added.config.uuid,
          unix_timestamp: T0 / 1000,
          created_at: T0,
          updated_at: T0,
          rev: 1,
          updated_by: 'device-a',
        });
      }
      // The caller gets copies, as from add().
      result.added[0].name = 'changed outside';
      expect(storage.getByUUID(uuids[0]).name).toBe('bag-0');
      expect(copies[0].config.uuid).toBe('copied');
    });

    it('stamps an entry like a single add does', async () => {
      const together = await collection([]);
      const single = await collection([], 'MILL');

      const { added } = await together.storage.addMany([entry('ignored', 4)]);
      const one: Entry = await single.storage.add(entry('ignored', 4));

      expect({ ...added[0].config, uuid: '' }).toEqual({
        ...one.config,
        uuid: '',
      });
    });

    it('leaves no entry behind and shows one message when the save fails', async () => {
      const { storage, events } = await collection([entry('there', 1)]);
      const list = storage.getAllEntries();
      failWrites();
      const shown = StorageClass.getMessagesShown();

      const result = await storage.addMany([entry('x'), entry('y')]);

      expect(result).toEqual({ saved: false, added: [] });
      expect(storage.getAllEntries()).toBe(list);
      expect(list).toEqual([entry('there', 1)]);
      expect(stored()).toEqual([entry('there', 1)]);
      // One attempt to save, and so one message.
      expect(db.set.calls.count()).toBe(1);
      expect(events).toEqual([{ type: 'UPDATE' }]);
      expect(StorageClass.getMessagesShown() - shown).toBe(1);

      // The next write of the collection does not store them either.
      db.failingWrites.clear();
      await storage.update(entry('there', 1));
      expect(db.uuids('BREWS')).toEqual(['there']);
    });

    it('adds nothing when one of the entries cannot be prepared', async () => {
      const { storage, events } = await collection([]);
      storage.unpreparable = ['broken'];

      const result = await storage.addMany([
        entry('x'),
        entry('y', 1, 'broken'),
      ]);

      expect(result).toEqual({ saved: false, added: [] });
      expect(storage.getAllEntries()).toEqual([]);
      expect(db.writes('BREWS')).toBe(0);
      expect(events).toEqual([]);
    });
  });

  describe('applyChanges', () => {
    it('stores an entry given in its stored form without preparing it', async () => {
      const brews = create(() => new UIBrewStorage());
      await brews.initializeStorage();
      const added = await brews.add(new Brew());
      const before = structuredClone(brews.getRawEntries()[0]) as Brew;
      const change = {
        ...before,
        // Text as old data can hold it; preparing a brew makes a number of it.
        grind_weight: '18,5' as unknown as number,
        note: 'changed',
      };
      delete change.vessel_name;
      now = T0 + 1000;

      const result = await brews.applyChanges({ updateStored: [change] });

      expect(result.saved).toBeTrue();
      const storedBrew = (db.values.get('BREWS') as Brew[])[0];
      expect(storedBrew).toEqual(brews.getRawEntries()[0] as Brew);
      expect(storedBrew.grind_weight as unknown).toBe('18,5');
      expect('vessel_name' in storedBrew).toBeFalse();
      expect(storedBrew.note).toBe('changed');
      expect(storedBrew.config).toEqual({
        ...before.config,
        rev: 2,
        updated_at: T0 + 1000,
      });
      expect(storedBrew.config.uuid).toBe(added.config.uuid);
      // The stored entry is apart from the caller's object.
      expect(brews.getRawEntries()[0]).not.toBe(change);
      expect(change.config).toEqual(before.config);
    });

    it('puts the entries given in their stored form back when the save fails', async () => {
      const { storage } = await collection([entry('a', 1), entry('b', 1)]);
      const before = structuredClone(stored());
      failWrites();

      const result = await storage.applyChanges({
        updateStored: [{ ...entry('b', 1), name: 'changed' }],
      });

      expect(result.saved).toBeFalse();
      expect(stored()).toEqual(before);
      expect(storage.getAllEntries()).toEqual(before);
    });

    it('replaces, removes and adds with one save', async () => {
      const { storage, events, removed } = await collection([
        entry('original', 4),
        entry('kept', 1),
        entry('doomed', 2),
      ]);
      now = T0 + 1000;

      const result = await storage.applyChanges({
        add: [entry('ignored', 9, 'bag-1'), entry('ignored', 9, 'bag-2')],
        update: [{ ...entry('original', 4), name: 'reduced' }],
        remove: ['doomed'],
      });

      expect(result.saved).toBeTrue();
      expect(db.writes('BREWS')).toBe(1);
      expect(stored().map((_entry) => _entry.name)).toEqual([
        'reduced',
        'kept',
        'bag-1',
        'bag-2',
      ]);
      expect(stored()).toEqual(storage.getAllEntries());
      expect(stored()[0].config.rev).toBe(5);
      expect(result.added).toEqual(stored().slice(2));
      expect(events).toEqual([
        { type: 'UPDATE', uuids: ['original', ...uuidsOf(result.added)] },
      ]);
      expect(removed).toEqual(['doomed']);
      expect(db.writes('DELETION_JOURNAL')).toBe(1);
      expect(db.journal()).toEqual([
        jasmine.objectContaining({
          collection: 'BREWS',
          uuid: 'doomed',
          rev: 2,
        }),
      ]);
    });

    it('takes everything back when the save fails', async () => {
      const entries = () => [
        entry('original', 4),
        entry('kept', 1),
        entry('doomed', 2),
      ];
      const { storage, events, removed } = await collection(entries());
      const list = storage.getAllEntries();
      const kept = [...list];
      failWrites();

      const result = await storage.applyChanges({
        add: [entry('ignored', 9, 'bag-1')],
        update: [
          { ...entry('original', 4), name: 'reduced' },
          { ...entry('doomed', 2), name: 'changed first' },
        ],
        remove: ['doomed'],
      });

      expect(result).toEqual({ saved: false, added: [] });
      expect(storage.getAllEntries()).toBe(list);
      expect(list.length).toBe(3);
      expect(list.every((_entry, i) => _entry === kept[i])).toBeTrue();
      expect(list).toEqual(entries());
      expect(stored()).toEqual(entries());
      expect(events).toEqual([{ type: 'UPDATE' }]);
      expect(removed).toEqual([]);
      expect(db.journal()).toEqual([]);
    });

    it('puts nothing into entries that were read anew during the failing save', async () => {
      const { storage } = await collection([entry('a', 1)]);
      db.set.and.callFake(async () => {
        // For example an import that replaced the stored entries.
        db.values.set('BREWS', [entry('imported')]);
        await storage.reinitializeStorage();
        return false;
      });

      const result = await storage.applyChanges({
        add: [entry('x')],
        update: [{ ...entry('a', 1), name: 'changed' }],
      });

      expect(result.saved).toBeFalse();
      expect(storage.getAllEntries()).toEqual([entry('imported')]);
    });

    it('changes nothing while the collection was not read', async () => {
      db.values.set('BREWS', [entry('a', 1)]);
      db.unreadable.add('BREWS');
      const storage = create(() => new NamedTestStorage('BREWS'));
      await storage.initializeStorage().catch(() => undefined);
      const events: unknown[] = [];
      storage.attachOnEvent().subscribe((_event) => events.push(_event));

      expect(await storage.updateMany([entry('a', 1)])).toBeFalse();
      expect(await storage.addMany([entry('x')])).toEqual({
        saved: false,
        added: [],
      });
      expect(
        await storage.applyChanges({ add: [entry('x')], remove: ['a'] }),
      ).toEqual({ saved: false, added: [] });
      // Also without changes, so it tells whether the collection is written.
      expect((await storage.applyChanges({})).saved).toBeFalse();

      expect(storage.getAllEntries()).toEqual([]);
      expect(stored()).toEqual([entry('a', 1)]);
      expect(db.set).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });

    it('does not save when there is nothing to change', async () => {
      const { storage, events } = await collection([entry('a', 1)]);

      expect(await storage.applyChanges({})).toEqual({
        saved: true,
        added: [],
      });
      expect(await storage.updateMany([])).toBeTrue();
      expect((await storage.addMany([])).saved).toBeTrue();

      expect(db.set).not.toHaveBeenCalled();
      expect(events).toEqual([]);
    });
  });
});
