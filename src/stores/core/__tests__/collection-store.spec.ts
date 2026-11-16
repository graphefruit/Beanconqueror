import { CollectionStore } from '../collection-store';
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

  beforeEach(() => {
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
    );
  });

  it('is empty until the collection has been read', async () => {
    expect(store.entries()).toEqual([]);

    await source.load([entry('a'), entry('b')]);

    expect(store.entries()).toEqual([entry('a'), entry('b')]);
  });

  it('follows a collection that could not be read', async () => {
    source.entries = [entry('a')];
    expect(store.entries()).toEqual([entry('a')]);
    source.entries = [];

    await source.fail();

    expect(store.entries()).toEqual([]);
  });

  it('hands out frozen copies that nothing shares with the storage', async () => {
    const stored = entry('a');
    await source.load([stored]);

    const [copy] = store.entries();
    stored.name = 'changed without an event';

    expect(copy).not.toBe(stored as unknown as typeof copy);
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
