import { signal } from '@angular/core';

import { readSettled, StoreHub } from '../store-hub';

describe('StoreHub', () => {
  let hub: StoreHub;

  beforeEach(() => {
    hub = new StoreHub();
  });

  it('is reloading while the work runs and resolves its result', async () => {
    let during: string | undefined;

    const result = await hub.reload(async () => {
      during = hub.loadState();
      await Promise.resolve();
      return 'imported';
    });

    expect(during).toBe('reloading');
    expect(result).toBe('imported');
    expect(hub.loadState()).toBe('ready');
  });

  it('ends the reload also when the work fails', async () => {
    await expectAsync(
      hub.reload(() => Promise.reject(new Error('import failed'))),
    ).toBeRejectedWithError('import failed');

    expect(hub.loadState()).toBe('ready');
  });

  it('stays reloading until reloads started together have all ended', async () => {
    let endFirst!: () => void;
    const first = hub.reload(
      () => new Promise<void>((resolve) => (endFirst = resolve)),
    );
    const second = hub.reload(() => Promise.resolve());

    await second;
    expect(hub.loadState()).toBe('reloading');

    endFirst();
    await first;
    expect(hub.loadState()).toBe('ready');
  });
});

describe('readSettled', () => {
  let hub: StoreHub;
  let read: boolean;
  let stored: string[];
  let reads: number;
  const version = signal(0);
  const change = () => version.update((v) => v + 1);

  beforeEach(() => {
    hub = new StoreHub();
    read = false;
    stored = [];
    reads = 0;
  });

  function settled() {
    return readSettled(
      hub,
      { isRead: () => read },
      version,
      () => {
        reads++;
        return stored.join();
      },
      'initial',
    );
  }

  it('gives the initial value until the collection was read', () => {
    const value = settled();

    expect(value()).toBe('initial');

    read = true;
    stored = ['a'];
    change();

    expect(value()).toBe('a');
  });

  it('keeps the last value while the collection is not read', () => {
    read = true;
    stored = ['a'];
    const value = settled();
    expect(value()).toBe('a');

    read = false;
    stored = [];
    change();

    expect(value()).toBe('a');
  });

  it('reads once at the end of a reload, however often it changed', async () => {
    read = true;
    stored = ['a'];
    const value = settled();
    expect(value()).toBe('a');

    await hub.reload(async () => {
      stored = [];
      change();
      expect(value()).toBe('a');
      stored = ['b'];
      change();
      expect(value()).toBe('a');
      await Promise.resolve();
    });

    expect(value()).toBe('b');
    expect(reads).toBe(2);
  });
});
