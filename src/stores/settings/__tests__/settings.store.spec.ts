import { TestBed } from '@angular/core/testing';

import { Settings } from '../../../classes/settings/settings';
import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { ISettings } from '../../../interfaces/settings/iSettings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { StoreHub } from '../../core/store-hub';
import { assignInPlace, SettingsStore } from '../settings.store';

function storedSettings(fields: Partial<ISettings> = {}): object {
  const settings = new Settings();
  Object.assign(settings, fields);
  return JSON.parse(JSON.stringify(settings)) as object;
}

describe('SettingsStore', () => {
  let db: MemoryDatabase;
  let legacy: UISettingsStorage;
  let store: SettingsStore;

  const stored = () => (db.values.get('SETTINGS') as ISettings[])[0];

  beforeEach(async () => {
    db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
    db.values.set('SETTINGS', [storedSettings({ bean_rating: 5 })]);
    legacy = TestBed.inject(UISettingsStorage);
    await legacy.initializeStorage();
    store = TestBed.inject(SettingsStore);
    await legacy.storageReady();
  });

  it('hands out a frozen copy that changes neither the settings nor the stored ones', () => {
    const settings = store.settings();

    expect(settings.bean_rating).toBe(5);
    expect(settings).not.toBe(legacy.getSettings() as never);
    expect(() => ((settings as ISettings).bean_rating = 9)).toThrowError(
      TypeError,
    );
    expect(
      () => ((settings as ISettings).bean_sort.OPEN.sort_after = 'X' as never),
    ).toThrowError(TypeError);
    expect(legacy.getSettings().bean_rating).toBe(5);
    expect(stored().bean_rating).toBe(5);
  });

  it('follows what legacy code saves and keeps the values that did not change', async () => {
    const before = store.settings();
    const live = legacy.getSettings();
    live.bean_rating = 7;

    await legacy.saveSettings(live);

    const after = store.settings();
    expect(after).not.toBe(before);
    expect(after.bean_rating).toBe(7);
    expect(after.bean_sort).toBe(before.bean_sort);
    expect(after.bean_manage_parameters).toBe(before.bean_manage_parameters);
  });

  it('changes the settings in place, so parts legacy code holds stay current', async () => {
    const live = legacy.getSettings();
    const heldSort = live.bean_sort.OPEN;
    const heldFilter = live.bean_filter.OPEN;
    const before = store.settings();

    const saved = await store.update((draft) => {
      draft.bean_sort.OPEN.sort_after = BEAN_SORT_AFTER.NAME;
      draft.bean_filter = {
        ...draft.bean_filter,
        OPEN: { ...draft.bean_filter.OPEN, favourite: true },
      };
    });

    expect(saved).toBeTrue();
    expect(legacy.getSettings()).toBe(live);
    expect(live.bean_sort.OPEN).toBe(heldSort);
    expect(heldSort.sort_after).toBe(BEAN_SORT_AFTER.NAME);
    expect(live.bean_filter.OPEN).toBe(heldFilter);
    expect(heldFilter.favourite).toBeTrue();
    expect(stored().bean_sort.OPEN.sort_after).toBe(BEAN_SORT_AFTER.NAME);
    expect(store.settings().bean_filter.OPEN.favourite).toBeTrue();
    expect(store.settings().bean_rating).toBe(before.bean_rating);
    expect(store.settings().wake_lock).toBe(before.wake_lock);
    expect(store.settings().bean_manage_parameters).toBe(
      before.bean_manage_parameters,
    );
  });

  it('saves nothing when nothing changed', async () => {
    const writes = db.writes('SETTINGS');

    expect(await store.update(() => undefined)).toBeTrue();

    expect(db.writes('SETTINGS')).toBe(writes);
  });

  it('changes nothing when a change throws, and goes on with the next', async () => {
    const failing = store.update((draft) => {
      draft.bean_rating = 1;
      throw new Error('broken change');
    });

    await expectAsync(failing).toBeRejectedWithError('broken change');
    expect(legacy.getSettings().bean_rating).toBe(5);
    expect(await store.update((draft) => (draft.bean_rating = 3))).toBeTrue();
    expect(store.settings().bean_rating).toBe(3);
  });

  it('leaves the settings as they were when they could not be saved', async () => {
    db.failingWrites.add('SETTINGS');

    const saved = await store.update((draft) => {
      draft.bean_rating = 1;
      draft.bean_sort.OPEN.sort_after = BEAN_SORT_AFTER.NAME;
    });

    expect(saved).toBeFalse();
    expect(legacy.getSettings().bean_rating).toBe(5);
    expect(legacy.getSettings().bean_sort.OPEN.sort_after).not.toBe(
      BEAN_SORT_AFTER.NAME,
    );
    expect(store.settings().bean_rating).toBe(5);
  });

  it('shows the imported settings once the reload after an import has ended', async () => {
    const hub = TestBed.inject(StoreHub);
    expect(store.settings().bean_rating).toBe(5);
    let during: number | undefined;

    await hub.reload(async () => {
      db.values.set('SETTINGS', [storedSettings({ bean_rating: 10 })]);
      await legacy.reinitializeStorage();
      during = store.settings().bean_rating;
    });

    expect(during).toBe(5);
    expect(store.settings().bean_rating).toBe(10);
  });
});

describe('assignInPlace', () => {
  it('keeps objects and arrays and takes on what changed', () => {
    const items = ['a', 'b'];
    const nested = { kept: 1, gone: 2, items };
    const target: Record<string, unknown> = { nested, plain: 1 };

    assignInPlace(
      target,
      'nested',
      { nested: { kept: 3, items: ['c'] } },
      'nested',
    );
    assignInPlace(target, 'plain', {}, 'plain');

    expect(target.nested).toBe(nested);
    expect(nested).toEqual({ kept: 3, items: ['c'] } as never);
    expect(nested.items).toBe(items);
    expect('plain' in target).toBeFalse();
  });

  it('replaces a value of another kind with a copy', () => {
    const source = { value: { deep: [1] } };
    const target: Record<string, unknown> = { value: 'text' };

    assignInPlace(target, 'value', source, 'value');

    expect(target.value).toEqual({ deep: [1] });
    expect(target.value).not.toBe(source.value);
  });
});
