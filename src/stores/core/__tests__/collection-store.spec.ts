import { TestBed } from '@angular/core/testing';

import { StorageClass } from '../../../classes/storageClass';
import { UIAlert } from '../../../services/uiAlert';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { CollectionStore, StoreSource } from '../collection-store';
import { StoreHub } from '../store-hub';
import { FakeStoreSource } from './fake-store-source';

interface Entry {
  config: { uuid: string };
  name: string;
}

const entry = (uuid: string, name = uuid): Entry => ({
  config: { uuid },
  name,
});

describe('CollectionStore', () => {
  let source: FakeStoreSource;
  let ingested: string[];
  let store: CollectionStore<Entry>;
  let logError: jasmine.Spy;
  let hub: StoreHub;

  beforeEach(() => {
    hub = new StoreHub();
    source = new FakeStoreSource();
    ingested = [];
    logError = jasmine.createSpy('error');
    store = new CollectionStore<Entry>(
      source,
      (json) => {
        ingested.push(json);
        return JSON.parse(json) as Entry;
      },
      { error: logError },
      (entry) => entry,
      hub,
    );
  });

  it('is empty until the collection has been read', async () => {
    expect(store.entries()).toEqual([]);

    await source.load([entry('a'), entry('b')]);

    expect(store.entries()).toEqual([entry('a'), entry('b')]);
  });

  it('stays empty when the collection could not be read', async () => {
    await source.fail();

    expect(store.entries()).toEqual([]);
  });

  it('keeps its entries when the collection could not be read anew', async () => {
    await source.load([entry('a')]);
    const before = store.entries();

    source.reread('unreadable');

    expect(store.entries()).toBe(before);

    source.reread([entry('b')]);

    expect(store.entries()).toEqual([entry('b')]);
  });

  it('keeps its entries while the stores reload and changes once at the end', async () => {
    await source.load([entry('a')]);
    const before = store.entries();
    let during: unknown;

    await hub.reload(async () => {
      source.reread([]);
      source.reread([entry('b'), entry('c')]);
      during = store.entries();
      await Promise.resolve();
    });

    expect(during).toBe(before);
    expect(store.entries().map((e) => e.name)).toEqual(['b', 'c']);
    expect(ingested.length).toBe(3);
  });

  it('shows the last entries read after a reload that failed', async () => {
    await source.load([entry('a')]);
    expect(store.entries().length).toBe(1);

    await expectAsync(
      hub.reload(() => {
        source.reread('unreadable');
        return Promise.reject(new Error('not read again'));
      }),
    ).toBeRejectedWithError('not read again');

    expect(hub.loadState()).toBe('ready');
    expect(store.entries().map((e) => e.name)).toEqual(['a']);
  });

  it('hands out frozen copies that nothing shares with the storage', async () => {
    const stored = entry('a');
    await source.load([stored]);

    const [copy] = store.entries();
    stored.name = 'changed without an event';

    expect(copy).not.toBe(stored);
    expect(copy.name).toBe('a');
    expect(Object.isFrozen(copy)).toBeTrue();
    expect(Object.isFrozen(copy.config)).toBeTrue();
    expect(Object.isFrozen(store.entries())).toBeTrue();
  });

  it('shows every change after its event', async () => {
    await source.load([entry('a')]);
    expect(store.entries().map((e) => e.name)).toEqual(['a']);

    source.change([entry('a', 'renamed'), entry('b')]);

    expect(store.entries().map((e) => e.name)).toEqual(['renamed', 'b']);
  });

  it('gives only changed entries a new object, also when entries move', async () => {
    await source.load([entry('a'), entry('b'), entry('c')]);
    const [a, b, c] = store.entries();

    source.change([entry('c'), entry('a'), entry('b', 'changed')]);
    const [c2, a2, b2] = store.entries();

    expect(c2).toBe(c);
    expect(a2).toBe(a);
    expect(b2).not.toBe(b);
    expect(b2.name).toBe('changed');
  });

  it('keeps its entries when an event changed nothing', async () => {
    await source.load([entry('a')]);
    const before = store.entries();

    source.change([entry('a')]);

    expect(store.entries()).toBe(before);
  });

  it('keeps entries with the same content, each object once', async () => {
    await source.load([entry('a'), entry('a')]);
    const [first, second] = store.entries();
    expect(first).not.toBe(second);

    source.change([entry('a'), entry('b'), entry('a')]);

    expect(store.entries()[0]).toBe(first);
    expect(store.entries()[2]).toBe(second);
  });

  it('drops removed entries', async () => {
    await source.load([entry('a'), entry('b')]);
    const [, b] = store.entries();

    source.change([entry('b')]);

    expect(store.entries()).toEqual([b]);
    expect(store.entries()[0]).toBe(b);
  });

  it('compares once for several changes before a read', async () => {
    await source.load([entry('a'), entry('b')]);
    store.entries();
    ingested = [];

    source.change([entry('a', 'one'), entry('b')]);
    source.change([entry('a', 'two'), entry('b')]);
    source.change([entry('a', 'three'), entry('b')]);

    expect(store.entries().map((e) => e.name)).toEqual(['three', 'b']);
    expect(ingested).toEqual([JSON.stringify(entry('a', 'three'))]);
  });

  it('skips stored entries that are no objects and leaves them in the storage', async () => {
    const stored = [null, entry('a'), 'broken', undefined, 7, entry('b')];
    await source.load(stored);

    expect(store.entries()).toEqual([entry('a'), entry('b')]);
    expect(ingested).toEqual([
      JSON.stringify(entry('a')),
      JSON.stringify(entry('b')),
    ]);
    expect(source.entries).toBe(stored);
    expect(stored).toEqual([
      null,
      entry('a'),
      'broken',
      undefined,
      7,
      entry('b'),
    ]);
  });

  it('logs how many entries it skipped, once and without their content', async () => {
    await source.load([null, entry('a'), 'broken']);
    store.entries();
    source.change([null, entry('a', 'renamed'), 'broken']);
    store.entries();

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.calls.argsFor(0).join(' ')).toContain('2');
    expect(logError.calls.argsFor(0).join(' ')).not.toContain('broken');

    source.change([null, entry('a')]);
    store.entries();

    expect(logError).toHaveBeenCalledTimes(2);
  });

  it('logs nothing while every stored entry is an object', async () => {
    await source.load([entry('a')]);
    store.entries();

    expect(logError).not.toHaveBeenCalled();
  });

  it('announces each change', () => {
    const seen: unknown[] = [];
    store.changes.subscribe((change) => seen.push(change));

    source.change([entry('a')]);

    expect(seen).toEqual([{ type: 'UPDATE' }]);
  });
});

class TestStorage extends StorageClass {
  public constructor() {
    super('BEANS');
  }
}

/** A store on a collection, and how to look into and break that collection. */
interface Writable {
  store: CollectionStore<Entry>;
  /** The stored entries, as the collection holds them. */
  stored(): Entry[];
  failSaves(): void;
}

/**
 * What the store's writes promise, whichever storage it writes to: the fake
 * that other specs use must behave like the legacy storage.
 */
function describeWrites(
  name: string,
  open: (entries: Entry[]) => Promise<Writable>,
): void {
  describe(`CollectionStore writing to ${name}`, () => {
    const NOW = Date.parse('2026-05-01T10:00:00.000Z');
    let w: Writable;

    beforeEach(async () => {
      spyOn(Date, 'now').and.returnValue(NOW);
      w = await open([entry('a'), entry('b')]);
    });

    const names = () => w.store.entries().map((e) => e.name);

    it('adds an entry with a new uuid and the time of now, as legacy code does', async () => {
      const uuid = await w.store.add({ config: { uuid: 'mine' }, name: 'new' });

      expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
      const added = w.stored().find((e) => e.config.uuid === uuid);
      expect(added?.name).toBe('new');
      expect(
        (added?.config as { unix_timestamp?: number }).unix_timestamp,
      ).toBe(NOW / 1000);
      expect(names()).toEqual(['a', 'b', 'new']);
    });

    it('changes a copy of the entry and stores it in its place', async () => {
      const before = w.store.entries();

      const saved = await w.store.update('b', (draft) => {
        draft.name = 'changed';
      });

      expect(saved).toBeTrue();
      expect(w.stored().map((e) => e.name)).toEqual(['a', 'changed']);
      expect(names()).toEqual(['a', 'changed']);
      expect(w.store.entries()[0]).toBe(before[0]);
      expect(before[1].name).toBe('b');
    });

    it('starts each change from what the one before saved', async () => {
      const toggle = (draft: Entry) => {
        draft.name = draft.name === 'a' ? 'on' : 'a';
      };

      const results = await Promise.all([
        w.store.update('a', toggle),
        w.store.update('a', toggle),
        w.store.update('a', toggle),
      ]);

      expect(results).toEqual([true, true, true]);
      expect(names()).toEqual(['on', 'b']);
    });

    it('removes an entry', async () => {
      expect(await w.store.remove('a')).toBeTrue();

      expect(w.stored().map((e) => e.name)).toEqual(['b']);
      expect(names()).toEqual(['b']);
    });

    it('saves nothing for an unknown uuid', async () => {
      const before = w.stored();

      expect(await w.store.update('x', (d) => (d.name = 'x'))).toBeFalse();
      expect(await w.store.remove('x')).toBeFalse();

      expect(w.stored()).toEqual(before);
    });

    it('leaves everything as it was when the save fails', async () => {
      const before = w.store.entries();
      const stored = w.stored();
      w.failSaves();

      expect(await w.store.update('a', (d) => (d.name = 'lost'))).toBeFalse();
      expect(await w.store.remove('b')).toBeFalse();
      expect(await w.store.add(entry('c'))).toBeUndefined();

      expect(w.stored()).toEqual(stored);
      expect(w.store.entries()).toEqual(before);
    });

    it('saves nothing when a change throws, and goes on with the next', async () => {
      const failing = w.store.update('a', () => {
        throw new Error('broken change');
      });

      await expectAsync(failing).toBeRejectedWithError('broken change');
      expect(names()).toEqual(['a', 'b']);
      expect(await w.store.update('a', (d) => (d.name = 'next'))).toBeTrue();
      expect(names()).toEqual(['next', 'b']);
    });
  });
}

const logOnly = { error: () => undefined };
const parse = (json: string) => JSON.parse(json) as Entry;

describeWrites('the fake collection', async (entries) => {
  const source = new FakeStoreSource();
  await source.load(entries);
  return {
    store: new CollectionStore<Entry>(
      source,
      parse,
      logOnly,
      (e) => e,
      new StoreHub(),
    ),
    stored: () => source.entries as Entry[],
    failSaves: () => (source.failSaves = true),
  };
});

describeWrites('a legacy storage', async (entries) => {
  const db = new MemoryDatabase();
  TestBed.configureTestingModule({ providers: db.providers() });
  db.values.set('BEANS', entries);
  const storage = TestBed.runInInjectionContext(() => new TestStorage());
  await storage.initializeStorage();
  return {
    store: new CollectionStore<Entry>(
      storage,
      parse,
      logOnly,
      (e) => e,
      new StoreHub(),
    ),
    stored: () => db.values.get('BEANS') as Entry[],
    failSaves: () => db.failingWrites.add('BEANS'),
  };
});

describe('CollectionStore on a legacy storage that cannot save', () => {
  it('takes the change back in memory and tells the user', async () => {
    const db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
    db.values.set('BEANS', [entry('a')]);
    const storage = TestBed.runInInjectionContext(() => new TestStorage());
    await storage.initializeStorage();
    const source: StoreSource = storage;
    const store = new CollectionStore<Entry>(
      source,
      parse,
      logOnly,
      (e) => e,
      new StoreHub(),
    );
    db.failingWrites.add('BEANS');

    expect(await store.update('a', (d) => (d.name = 'lost'))).toBeFalse();

    expect((storage.getRawEntries()[0] as Entry).name).toBe('a');
    expect(store.entries().map((e) => e.name)).toEqual(['a']);
    const alert = UIAlert.getInstance() as unknown as Record<
      string,
      jasmine.Spy
    >;
    expect(alert.showMessage).toHaveBeenCalledWith(
      'STORAGE_SAVE_FAILED',
      undefined,
      undefined,
      true,
    );
  });
});
