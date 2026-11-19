import { TestBed } from '@angular/core/testing';

import { MemoryDatabase } from '../../test-utils/memory-database';
import { UIAlert } from '../uiAlert';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UiVersionStorage } from '../uiVersionStorage';

/**
 * Settings and version create their one entry themselves. When that could
 * not be saved, the next save stores it instead of failing for the rest of
 * the session.
 */
describe('A collection of one entry whose creation could not be saved', () => {
  let db: MemoryDatabase;
  let alert: jasmine.SpyObj<Pick<UIAlert, 'showMessage'>>;

  beforeEach(() => {
    db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
    alert = (UIAlert.getInstance as jasmine.Spy)() as typeof alert;
    alert.showMessage.calls.reset();
  });

  afterEach(() => {
    UISettingsStorage.instance = undefined;
  });

  it('stores the settings with the next save', async () => {
    db.failingWrites.add('SETTINGS');
    const storage = TestBed.inject(UISettingsStorage);
    await storage.initializeStorage();
    await storage.storageReady();
    expect(db.values.has('SETTINGS')).toBeFalse();
    alert.showMessage.calls.reset();
    db.failingWrites.clear();
    const settings = storage.getSettings();
    settings.show_archived_beans = !settings.show_archived_beans;

    expect(await storage.saveSettings(settings)).toBeTrue();

    expect(db.values.get('SETTINGS')).toEqual([
      jasmine.objectContaining({
        show_archived_beans: settings.show_archived_beans,
        config: jasmine.objectContaining({ uuid: settings.config.uuid }),
      }),
    ]);
    expect(alert.showMessage).not.toHaveBeenCalled();

    settings.show_archived_beans = !settings.show_archived_beans;
    expect(await storage.saveSettings(settings)).toBeTrue();
    expect(db.values.get('SETTINGS')).toEqual([
      jasmine.objectContaining({
        show_archived_beans: settings.show_archived_beans,
      }),
    ]);
  });

  it('stores the version with the next save', async () => {
    db.failingWrites.add('VERSION');
    const storage = TestBed.inject(UiVersionStorage);
    await storage.initializeStorage();
    await storage.storageReady();
    expect(db.values.has('VERSION')).toBeFalse();
    alert.showMessage.calls.reset();
    db.failingWrites.clear();
    const version = storage.getVersion();
    version.updatedDataVersions.push('UPDATE_1');

    await storage.saveVersion(version);

    expect(db.values.get('VERSION')).toEqual([
      jasmine.objectContaining({
        updatedDataVersions: ['UPDATE_1'],
        config: jasmine.objectContaining({ uuid: version.config.uuid }),
      }),
    ]);
    expect(alert.showMessage).not.toHaveBeenCalled();
  });

  it('does not add settings to a collection that holds other ones', async () => {
    db.values.set('SETTINGS', [{ config: { uuid: 'stored' } }]);
    const storage = TestBed.inject(UISettingsStorage);
    await storage.initializeStorage();
    await storage.storageReady();
    const other = structuredClone(storage.getSettings());
    other.config.uuid = 'other';

    expect(await storage.saveSettings(other)).toBeFalse();

    expect((db.values.get('SETTINGS') as unknown[]).length).toBe(1);
  });
});
