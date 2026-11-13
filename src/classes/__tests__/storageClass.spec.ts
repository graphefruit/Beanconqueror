import { TestBed } from '@angular/core/testing';

import { TranslateService } from '@ngx-translate/core';

import { DeviceIdentityService } from '../../services/deviceIdentity/device-identity.service';
import { UIAlert } from '../../services/uiAlert';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UILog } from '../../services/uiLog';
import { UIStorage } from '../../services/uiStorage';
import {
  createMockTranslateService,
  createMockUIAlert,
  createMockUILog,
} from '../../test-utils';
import { Bean } from '../bean/bean';
import { Brew } from '../brew/brew';
import { StorageClass } from '../storageClass';

class TestStorage extends StorageClass {
  public constructor() {
    super('TEST_DB');
  }

  public setEntries(entries: any[]): void {
    this.storedData = entries;
  }
}

class NamedTestStorage extends StorageClass {
  public constructor(_dbPath: string) {
    super(_dbPath);
  }

  public setEntries(entries: any[]): void {
    this.storedData = entries;
  }
}

class ThrowingPreparationStorage extends TestStorage {
  protected override prepareEntryForStorage(_entry: any): any {
    throw new Error('prepare failed');
  }
}

async function expectSettled<T>(promise: Promise<T>): Promise<T> {
  const pending = Symbol('pending');
  const result = await Promise.race([
    promise,
    new Promise<typeof pending>((resolve) => {
      setTimeout(() => resolve(pending), 100);
    }),
  ]);

  if (result === pending) {
    fail('Expected promise to settle before the timeout');
  }

  return result as T;
}

describe('StorageClass', () => {
  let storage: TestStorage;
  let mockUIStorage: jasmine.SpyObj<UIStorage>;
  let mockUILog: jasmine.SpyObj<any> & {
    logs: string[];
    errors: string[];
    debugLogs: string[];
  };
  let mockUIAlert: jasmine.SpyObj<any>;

  const entry = (uuid?: string) => ({
    config: uuid ? { uuid } : {},
    name: 'Test entry',
  });

  beforeEach(() => {
    mockUIStorage = jasmine.createSpyObj<UIStorage>('UIStorage', [
      'get',
      'set',
    ]);
    mockUILog = createMockUILog();
    mockUIAlert = createMockUIAlert();
    mockUIAlert.showMessage.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: mockUIStorage },
        { provide: UILog, useValue: mockUILog },
      ],
    });

    spyOn(UIAlert, 'getInstance').and.returnValue(mockUIAlert);
    storage = TestBed.runInInjectionContext(() => new TestStorage());
  });

  it('reports successful saves from addAndConfirm, update, and removeByUUID', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(true));

    const addResult = await storage.addAndConfirm(entry());
    const uuid = addResult.entry.config.uuid;
    const updateResult = await storage.update({
      ...addResult.entry,
      name: 'Updated entry',
    });
    const removeResult = await storage.removeByUUID(uuid);

    expect(addResult.saved).toBeTrue();
    expect(updateResult).toBeTrue();
    expect(removeResult).toBeTrue();
    expect(mockUIAlert.showMessage).not.toHaveBeenCalled();
  });

  it('reports failed saves when uiStorage.set resolves something other than true', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve('not-saved' as any));

    const addResult = await storage.addAndConfirm(entry());
    storage.setEntries([entry('update-uuid')]);
    const updateResult = await storage.update(entry('update-uuid'));
    storage.setEntries([entry('delete-uuid')]);
    const removeResult = await storage.removeByUUID('delete-uuid');

    expect(addResult.saved).toBeFalse();
    expect(updateResult).toBeFalse();
    expect(removeResult).toBeFalse();
    expect(mockUIAlert.showMessage).toHaveBeenCalledTimes(3);
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'Storage - Save Set - Unsuccessfully  - "not-saved"',
      'CRITICAL ERROR',
    );
    expect(mockUILog.errors).toContain(
      'Storage - Update  - Unsucessfully - update-uuid - save failed',
    );
  });

  it('reports failed saves when uiStorage.set rejects', async () => {
    mockUIStorage.set.and.returnValue(Promise.reject(new Error('set failed')));

    const addResult = await storage.addAndConfirm(entry());
    storage.setEntries([entry('update-uuid')]);
    const updateResult = await storage.update(entry('update-uuid'));
    storage.setEntries([entry('delete-uuid')]);
    const removeResult = await storage.removeByUUID('delete-uuid');

    expect(addResult.saved).toBeFalse();
    expect(updateResult).toBeFalse();
    expect(removeResult).toBeFalse();
    expect(mockUIAlert.showMessage).toHaveBeenCalledTimes(3);
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      '{}',
      'CRITICAL ERROR - SAVE SET',
    );
    expect(mockUILog.errors).toContain(
      'Storage - Update  - Unsucessfully - update-uuid - save failed',
    );
  });

  it('reports failed saves when uiStorage.set throws synchronously', async () => {
    mockUIStorage.set.and.callFake(() => {
      throw new Error('set threw');
    });

    const addResult = await storage.addAndConfirm(entry());
    storage.setEntries([entry('update-uuid')]);
    const updateResult = await storage.update(entry('update-uuid'));
    storage.setEntries([entry('delete-uuid')]);
    const removeResult = await storage.removeByUUID('delete-uuid');

    expect(addResult.saved).toBeFalse();
    expect(updateResult).toBeFalse();
    expect(removeResult).toBeFalse();
    expect(mockUIAlert.showMessage).toHaveBeenCalledTimes(3);
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'set threw',
      'CRITICAL ERROR',
    );
    expect(mockUILog.errors).toContain(
      'Storage - Update  - Unsucessfully - update-uuid - save failed',
    );
  });

  it('handles a rejected alert promise while preserving the storage failure result', async () => {
    const alertError = new Error('alert failed');
    mockUIStorage.set.and.returnValue(Promise.resolve(false));
    mockUIAlert.showMessage.and.callFake(() => Promise.reject(alertError));

    const result = await expectSettled(storage.addAndConfirm(entry()));
    await Promise.resolve();

    expect(result.saved).toBeFalse();
    expect(result.entry.config.uuid).toEqual(jasmine.any(String));
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'Storage - Save Set - Unsuccessfully  - false',
      'CRITICAL ERROR',
    );
    expect(mockUILog.error).toHaveBeenCalledWith(
      'Storage - Alert - Unsuccessfully',
      alertError,
    );
  });

  it('does not wait for alert dismissal before settling a storage failure', async () => {
    const pendingAlert = new Promise<void>(() => undefined);
    const catchSpy = spyOn(pendingAlert, 'catch').and.callThrough();
    mockUIStorage.set.and.returnValue(Promise.resolve(false));
    mockUIAlert.showMessage.and.returnValue(pendingAlert);

    const result = await expectSettled(storage.addAndConfirm(entry()));

    expect(result.saved).toBeFalse();
    expect(catchSpy).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('keeps update not-found failures distinguishable from save failures', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(true));
    storage.setEntries([entry('stored-uuid')]);

    const updateResult = await storage.update(entry('missing-uuid'));

    expect(updateResult).toBeFalse();
    expect(mockUIStorage.set).not.toHaveBeenCalled();
    expect(mockUILog.errors).toContain(
      'Storage - Update  - Unsucessfully - missing-uuid - not found',
    );
    expect(mockUILog.errors).not.toContain(
      'Storage - Update  - Unsucessfully - missing-uuid - save failed',
    );
  });

  it('keeps add returning a cloned entry with a uuid when the save fails', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(false));
    const newEntry = entry();

    const result = await storage.add(newEntry);

    expect(result).not.toBe(newEntry);
    expect(result.config.uuid).toEqual(jasmine.any(String));
    expect(storage.getAllEntries()[0].config.uuid).toBe(result.config.uuid);
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'Storage - Save Set - Unsuccessfully  - false',
      'CRITICAL ERROR',
    );
  });

  it('resolves addAndConfirm as an unsaved add when preparation throws', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(true));
    storage = TestBed.runInInjectionContext(
      () => new ThrowingPreparationStorage(),
    );
    const newEntry = entry();

    const result = await expectSettled(storage.addAndConfirm(newEntry));

    expect(result.saved).toBeFalse();
    expect(result.entry).not.toBe(newEntry);
    expect(result.entry.config.uuid).toEqual(jasmine.any(String));
    expect(mockUIStorage.set).not.toHaveBeenCalled();
    expect(mockUILog.errors).toContain('Storage - Add - Unsuccessfully');
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'prepare failed',
      'ADD CRITICAL ERROR',
    );
  });

  it('resolves update as an unsaved update when preparation throws', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(true));
    storage = TestBed.runInInjectionContext(
      () => new ThrowingPreparationStorage(),
    );

    const result = await expectSettled(storage.update(entry('update-uuid')));

    expect(result).toBeFalse();
    expect(mockUIStorage.set).not.toHaveBeenCalled();
    expect(mockUILog.errors).toContain(
      'Storage - Update  - Unsucessfully - Execption occured',
    );
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'Storage - Update  - Unsucessfully - Execption occured - prepare failed',
      'CRITICAL ERROR',
    );
  });

  it('resolves removeByUUID as an unsaved delete when stored data has an unexpected shape', async () => {
    mockUIStorage.set.and.returnValue(Promise.resolve(true));
    const malformedEntry = {};
    Object.defineProperty(malformedEntry, 'config', {
      get: () => {
        throw new Error('stored shape failed');
      },
    });
    storage.setEntries([malformedEntry]);

    const result = await expectSettled(storage.removeByUUID('delete-uuid'));

    expect(result).toBeFalse();
    expect(mockUIStorage.set).not.toHaveBeenCalled();
    expect(mockUILog.errors).toContain('Storage - Delete - Unsuccessfully');
    expect(mockUIAlert.showMessage).toHaveBeenCalledWith(
      'stored shape failed',
      'CRITICAL ERROR',
    );
  });
});

describe('typed storage normalization', () => {
  let mockUIStorage: jasmine.SpyObj<UIStorage>;
  let mockUILog: jasmine.SpyObj<any> & {
    logs: string[];
    errors: string[];
    debugLogs: string[];
  };

  beforeEach(() => {
    mockUIStorage = jasmine.createSpyObj<UIStorage>('UIStorage', [
      'get',
      'set',
    ]);
    mockUIStorage.set.and.returnValue(Promise.resolve(true));
    mockUILog = createMockUILog();

    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: mockUIStorage },
        { provide: UILog, useValue: mockUILog },
        { provide: TranslateService, useValue: createMockTranslateService() },
      ],
    });
  });

  it('normalizes bean numeric fields added through add or addAndConfirm', async () => {
    const storage = TestBed.runInInjectionContext(() => new UIBeanStorage());
    const addBean = new Bean();
    addBean.weight = '250' as unknown as number;
    addBean.cost = '12.5' as unknown as number;
    const confirmBean = new Bean();
    confirmBean.weight = '125' as unknown as number;
    confirmBean.cost = '7.75' as unknown as number;

    await storage.add(addBean);
    await storage.addAndConfirm(confirmBean);

    const entries = storage.getAllEntries();
    expect(entries[0].weight).toBe(250);
    expect(entries[0].cost).toBe(12.5);
    expect(entries[1].weight).toBe(125);
    expect(entries[1].cost).toBe(7.75);
  });

  it('normalizes bean numeric fields updated through update', async () => {
    const storage = TestBed.runInInjectionContext(() => new UIBeanStorage());
    const bean = new Bean();

    const addedBean = await storage.add(bean);
    addedBean.weight = '500' as unknown as number;
    addedBean.cost = '21.25' as unknown as number;
    await storage.update(addedBean);

    const [entry] = storage.getAllEntries();
    expect(entry.weight).toBe(500);
    expect(entry.cost).toBe(21.25);
  });

  it('normalizes brew numeric fields added through add or addAndConfirm', async () => {
    const storage = TestBed.runInInjectionContext(() => new UIBrewStorage());
    const addBrew = new Brew();
    addBrew.brew_quantity = '42' as unknown as number;
    addBrew.grind_weight = '18.5' as unknown as number;
    const confirmBrew = new Brew();
    confirmBrew.brew_quantity = '36' as unknown as number;
    confirmBrew.grind_weight = '16.25' as unknown as number;

    await storage.add(addBrew);
    await storage.addAndConfirm(confirmBrew);

    const entries = storage.getAllEntries();
    expect(entries[0].brew_quantity).toBe(42);
    expect(entries[0].grind_weight).toBe(18.5);
    expect(entries[1].brew_quantity).toBe(36);
    expect(entries[1].grind_weight).toBe(16.25);
  });

  it('normalizes brew numeric fields updated through update', async () => {
    const storage = TestBed.runInInjectionContext(() => new UIBrewStorage());
    const brew = new Brew();

    const addedBrew = await storage.add(brew);
    addedBrew.brew_quantity = '45' as unknown as number;
    addedBrew.grind_weight = '19.5' as unknown as number;
    await storage.update(addedBrew);

    const [entry] = storage.getAllEntries();
    expect(entry.brew_quantity).toBe(45);
    expect(entry.grind_weight).toBe(19.5);
  });
});

describe('StorageClass change info', () => {
  const T0 = 1_800_000_000_000;
  let now: number;
  let mockUIStorage: jasmine.SpyObj<UIStorage>;

  const create = <T>(factory: () => T): T =>
    TestBed.runInInjectionContext(factory);

  beforeEach(() => {
    now = T0;
    spyOn(Date, 'now').and.callFake(() => now);
    mockUIStorage = jasmine.createSpyObj<UIStorage>('UIStorage', [
      'get',
      'set',
    ]);
    mockUIStorage.set.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        { provide: UIStorage, useValue: mockUIStorage },
        { provide: UILog, useValue: createMockUILog() },
        { provide: TranslateService, useValue: createMockTranslateService() },
        {
          provide: DeviceIdentityService,
          useValue: { getDeviceId: () => 'device-a' },
        },
      ],
    });
    spyOn(UIAlert, 'getInstance').and.returnValue(createMockUIAlert());
  });

  it('does not track entries of untracked collections', async () => {
    for (const dbPath of ['TEST_DB', 'SETTINGS', 'VERSION']) {
      const storage = create(() => new NamedTestStorage(dbPath));
      const added = await storage.add({ config: {}, name: 'entry' });
      await storage.update({ ...added, name: 'changed' });

      const [stored] = storage.getAllEntries();
      expect(Object.keys(stored.config).sort())
        .withContext(dbPath)
        .toEqual(['unix_timestamp', 'uuid']);
    }
  });

  it('sets all change info fields when a bean is added', async () => {
    const storage = create(() => new UIBeanStorage());

    const added = await storage.add(new Bean());

    const [stored] = storage.getAllEntries();
    expect(stored.config.created_at).toBe(T0);
    expect(stored.config.updated_at).toBe(T0);
    expect(stored.config.rev).toBe(1);
    expect(stored.config.updated_by).toBe('device-a');
    expect(added.config.rev).toBe(1);
    expect(stored.config.unix_timestamp).toBe(Math.floor(T0 / 1000));
  });

  it('overwrites change info copied from another entry on add', async () => {
    const storage = create(() => new UIBrewStorage());
    const copy = new Brew();
    copy.config.rev = 7;
    copy.config.created_at = 5;
    copy.config.updated_by = 'device-b';

    await storage.add(copy);

    const [stored] = storage.getAllEntries();
    expect(stored.config.rev).toBe(1);
    expect(stored.config.created_at).toBe(T0);
    expect(stored.config.updated_by).toBe('device-a');
  });

  it('counts the revision up with every brew update and keeps created_at', async () => {
    const storage = create(() => new UIBrewStorage());
    const added = await storage.add(new Brew());
    const unixTimestamp = added.config.unix_timestamp;

    now = T0 + 1000;
    await storage.update(storage.getEntryByUUID(added.config.uuid));
    expect(storage.getAllEntries()[0].config.rev).toBe(2);

    now = T0 + 2000;
    await storage.update(storage.getEntryByUUID(added.config.uuid));
    const [stored] = storage.getAllEntries();
    expect(stored.config.rev).toBe(3);
    expect(stored.config.updated_at).toBe(T0 + 2000);
    expect(stored.config.updated_by).toBe('device-a');
    expect(stored.config.created_at).toBe(T0);
    expect(stored.config.unix_timestamp).toBe(unixTimestamp);
  });

  it('counts up from the stored revision when the caller holds an outdated brew', async () => {
    const storage = create(() => new UIBrewStorage());
    const added = await storage.add(new Brew());
    const outdated = storage.getEntryByUUID(added.config.uuid);
    await storage.update(storage.getEntryByUUID(added.config.uuid));
    await storage.update(storage.getEntryByUUID(added.config.uuid));

    await storage.update(outdated);

    expect(storage.getAllEntries()[0].config.rev).toBe(4);
  });

  it('keeps the change info on updates without touch', async () => {
    const storage = create(() => new UIBeanStorage());
    const added = await storage.add(new Bean());
    const bean = storage.getEntryByUUID(added.config.uuid);
    bean.name = 'Migrated';

    now = T0 + 5000;
    const saved = await storage.update(bean, { touch: false });

    const [stored] = storage.getAllEntries();
    expect(saved).toBeTrue();
    expect(stored.name).toBe('Migrated');
    expect(stored.config.rev).toBe(1);
    expect(stored.config.updated_at).toBe(T0);
    expect(stored.config.created_at).toBe(T0);
    expect(stored.config.updated_by).toBe('device-a');
  });

  it('does not create change info fields on legacy entries without touch', async () => {
    const storage = create(() => new NamedTestStorage('MILL'));
    storage.setEntries([
      { config: { uuid: 'legacy', unix_timestamp: 1_600_000_000 }, name: 'a' },
    ]);

    await storage.update(
      { config: { uuid: 'legacy', unix_timestamp: 1_600_000_000 }, name: 'b' },
      { touch: false },
    );

    expect(Object.keys(storage.getAllEntries()[0].config).sort()).toEqual([
      'unix_timestamp',
      'uuid',
    ]);
  });

  it('counts the revision up exactly once when the bean shares its config with the stored entry', async () => {
    const storage = create(() => new UIBeanStorage());
    const added = await storage.add(new Bean());
    const bean = storage.getEntryByUUID(added.config.uuid);
    const raw = (storage as any).storedData[0];
    // Typed beans are built with Object.assign and keep the stored config.
    expect(bean.config).toBe(raw.config);

    await storage.update(bean);

    expect(storage.getAllEntries()[0].config.rev).toBe(2);
  });

  it('keeps the stored entry apart from the object passed to update', async () => {
    const storage = create(() => new UIBeanStorage());
    const added = await storage.add(new Bean());
    const bean = storage.getEntryByUUID(added.config.uuid);
    await storage.update(bean);

    bean.name = 'Not saved';
    bean.config.rev = 99;

    const raw = (storage as any).storedData[0];
    expect(raw).not.toBe(bean);
    expect(raw.name).not.toBe('Not saved');
    expect(raw.config.rev).toBe(2);
  });

  it('fills in values with one save and keeps the change info', async () => {
    const storage = create(() => new NamedTestStorage('BREWS'));
    storage.setEntries([
      { config: { uuid: 'a', unix_timestamp: 1, rev: 3 } },
      { config: { uuid: 'b', unix_timestamp: 2 } },
    ]);
    const events: string[] = [];
    storage.attachOnEvent().subscribe((event) => events.push(event.type));

    const saved = await storage.backfillWithoutTouch((entries) => {
      for (const entry of entries) {
        entry.filled = true;
      }
      return entries.length;
    });

    expect(saved).toBeTrue();
    expect(mockUIStorage.set.calls.count()).toBe(1);
    expect(events).toEqual(['UPDATE']);
    const [first, second] = storage.getAllEntries();
    expect(first.filled).toBeTrue();
    expect(first.config.rev).toBe(3);
    expect(second.config).toEqual({ uuid: 'b', unix_timestamp: 2 });
  });

  it('does not save when the fill changes nothing', async () => {
    const storage = create(() => new NamedTestStorage('BREWS'));
    storage.setEntries([{ config: { uuid: 'a', unix_timestamp: 1 } }]);

    const saved = await storage.backfillWithoutTouch(() => 0);

    expect(saved).toBeTrue();
    expect(mockUIStorage.set.calls.count()).toBe(0);
  });

  it('reports a failed fill or save', async () => {
    const storage = create(() => new NamedTestStorage('BREWS'));
    storage.setEntries([{ config: { uuid: 'a', unix_timestamp: 1 } }]);

    const thrown = await storage.backfillWithoutTouch(() => {
      throw new Error('fill failed');
    });
    mockUIStorage.set.and.returnValue(Promise.resolve(false));
    const unsaved = await storage.backfillWithoutTouch(() => 1);

    expect(thrown).toBeFalse();
    expect(unsaved).toBeFalse();
  });
});
