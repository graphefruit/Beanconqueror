import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { ATTACHMENT_MANIFEST_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { StorageClass } from '../../classes/storageClass';
import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import {
  IAttachmentManifest,
  IAttachmentManifestEntry,
} from '../../interfaces/changeTracking/iAttachmentManifest';
import { DeletionJournalService } from '../deletionJournal/deletion-journal.service';
import { DeviceIdentityService } from '../deviceIdentity/device-identity.service';
import { UIBaristamodeBrewStorage } from '../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UIGraphStorage } from '../uiGraphStorage.service';
import { UIGreenBeanStorage } from '../uiGreenBeanStorage';
import { UILog } from '../uiLog';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UIRoastingMachineStorage } from '../uiRoastingMachineStorage';
import { UIStorage } from '../uiStorage';
import { UIWaterStorage } from '../uiWaterStorage';
import { AttachmentManifestService } from './attachment-manifest.service';

class FakeStorage extends StorageClass {
  public constructor(_dbPath: string) {
    super(_dbPath);
  }

  public setEntries(_entries: any[]): void {
    this.storedData = _entries;
  }
}

const COLLECTIONS: [unknown, string][] = [
  [UIBeanStorage, 'BEANS'],
  [UIBrewStorage, 'BREWS'],
  [UIMillStorage, 'MILL'],
  [UIPreparationStorage, 'PREPARATION'],
  [UIWaterStorage, 'WATER'],
  [UIGreenBeanStorage, 'GREEN_BEANS'],
  [UIRoastingMachineStorage, 'ROASTING_MACHINES'],
  [UIGraphStorage, 'GRAPH'],
  [UIBaristamodeBrewStorage, 'BARISTAMODE_BREWS'],
];

/** Stands in for UIStorage; values are copied like IndexedDB does. */
function createDatabase() {
  const data = new Map<string, unknown>();
  const read = async (_key: string) => {
    await Promise.resolve();
    return structuredClone(data.get(_key)) ?? null;
  };
  return {
    data,
    get: jasmine.createSpy('get').and.callFake(read),
    getOrFail: jasmine.createSpy('getOrFail').and.callFake(read),
    set: jasmine
      .createSpy('set')
      .and.callFake(async (_key: string, _value: unknown) => {
        await Promise.resolve();
        data.set(_key, structuredClone(_value));
        return true;
      }),
  };
}

type Database = ReturnType<typeof createDatabase>;

interface Setup {
  database: Database;
  storages: Record<string, FakeStorage>;
  /** Files that exist, path as looked up → size. */
  files: Map<string, number>;
  platforms: string[];
}

function createSetup(_platforms = ['capacitor', 'android']): Setup {
  const database = createDatabase();
  const storages: Record<string, FakeStorage> = {};
  const files = new Map<string, number>();
  const setup: Setup = { database, storages, files, platforms: _platforms };
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: UIStorage, useValue: database },
      {
        provide: UILog,
        useValue: jasmine.createSpyObj('UILog', [
          'log',
          'info',
          'error',
          'debug',
        ]),
      },
      {
        provide: DeviceIdentityService,
        useValue: { getDeviceId: () => 'device-a' },
      },
      {
        provide: DeletionJournalService,
        useValue: {
          record: () => Promise.resolve(),
          forgetExistingEntries: () => Promise.resolve(0),
        },
      },
      {
        provide: UIFileHelper,
        useValue: { getDataDirectory: () => 'DATA' },
      },
      {
        provide: Platform,
        useValue: { is: (_name: string) => setup.platforms.includes(_name) },
      },
      ...COLLECTIONS.map(([token, dbPath]) => ({
        provide: token as any,
        useFactory: () => new FakeStorage(dbPath),
      })),
    ],
  });
  for (const [token, dbPath] of COLLECTIONS) {
    storages[dbPath] = TestBed.inject(token as any);
  }
  return setup;
}

function createService(_setup: Setup) {
  const service = TestBed.inject(AttachmentManifestService);
  const statFile = spyOn(service as any, 'statFile').and.callFake(
    async (_path: string, _directory: string | undefined) => {
      await Promise.resolve();
      const key = (_directory ? _directory + ':' : '') + _path;
      const size = _setup.files.get(key);
      if (size === undefined) {
        throw new Error('File does not exist');
      }
      return { size };
    },
  );
  return { service, statFile };
}

/** A new service on the same data, as after a restart of the app. */
function restart(_setup: Setup) {
  const storages = _setup.storages;
  const entries = Object.fromEntries(
    Object.entries(storages).map(([dbPath, storage]) => [
      dbPath,
      storage.getAllEntries(),
    ]),
  );
  const stored = _setup.database.data.get(ATTACHMENT_MANIFEST_STORAGE_KEY);
  const next = createSetup(_setup.platforms);
  for (const [dbPath, list] of Object.entries(entries)) {
    next.storages[dbPath].setEntries(list);
  }
  if (stored !== undefined) {
    next.database.data.set(ATTACHMENT_MANIFEST_STORAGE_KEY, stored);
  }
  for (const [path, size] of _setup.files) {
    next.files.set(path, size);
  }
  return next;
}

/** Synthetic brews with flow profiles and beans with photos. */
function fillSyntheticData(_setup: Setup, _brews: number, _beans: number) {
  const brews = Array.from({ length: _brews }, (_, i) => {
    const uuid = `brew-${i}`;
    const brew: Record<string, any> = {
      config: { uuid, unix_timestamp: 1_600_000_000 + i },
      attachments: [],
      flow_profile: `brews/${uuid}_flow_profile.json`,
      reference_flow_profile: { type: REFERENCE_GRAPH_TYPE.NONE, uuid: '' },
    };
    _setup.files.set(`DATA:brews/${uuid}_flow_profile.json`, 1000 + i);
    if (i % 100 === 0) {
      brew.reference_flow_profile = {
        type: REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH,
        uuid,
      };
      _setup.files.set(`DATA:importedGraph/${uuid}_flow_profile.json`, 500);
    }
    return brew;
  });
  const beans = Array.from({ length: _beans }, (_, i) => {
    const uuid = `bean-${i}`;
    // Every other photo is stored with a leading slash, like older data.
    const path = (i % 2 === 0 ? '/' : '') + `${uuid}.jpg`;
    _setup.files.set(`DATA:${uuid}.jpg`, 200_000 + i);
    return { config: { uuid }, attachments: [path] };
  });
  _setup.storages.BREWS.setEntries(brews);
  _setup.storages.BEANS.setEntries(beans);
}

function storedManifest(_setup: Setup): IAttachmentManifest | undefined {
  return _setup.database.data.get(ATTACHMENT_MANIFEST_STORAGE_KEY) as
    | IAttachmentManifest
    | undefined;
}

function entryFor(
  _manifest: IAttachmentManifest,
  _path: string,
): IAttachmentManifestEntry | undefined {
  return _manifest.entries.find((_entry) => _entry.path === _path);
}

async function startAndBuild(_service: AttachmentManifestService) {
  await _service.start();
  await _service.reconcile();
}

describe('AttachmentManifestService', () => {
  it('lists path, size, type and owner of every referenced file', async () => {
    const setup = createSetup();
    fillSyntheticData(setup, 1200, 40);
    setup.storages.GRAPH.setEntries([
      { config: { uuid: 'graph-0' }, flow_profile: 'graphs/graph-0.json' },
    ]);
    setup.storages.BARISTAMODE_BREWS.setEntries([
      {
        config: { uuid: 'barista-0' },
        attachments: [],
        flow_profile: 'baristamode/barista-0.json',
      },
    ]);
    setup.files.set('DATA:graphs/graph-0.json', 42);
    setup.files.set('DATA:baristamode/barista-0.json', 43);
    const { service, statFile } = createService(setup);

    await startAndBuild(service);

    const manifest = storedManifest(setup);
    expect(manifest).toBeDefined();
    expect(manifest.version).toBe(1);
    expect(manifest.completed_at).toBeGreaterThan(0);
    // 1200 flow profiles, 12 imported graphs, 40 photos, graph, barista.
    expect(manifest.entries.length).toBe(1200 + 12 + 40 + 2);
    expect(statFile.calls.count()).toBe(manifest.entries.length);
    expect(entryFor(manifest, 'brews/brew-7_flow_profile.json')).toEqual({
      path: 'brews/brew-7_flow_profile.json',
      collection: 'BREWS',
      owner_uuid: 'brew-7',
      kind: 'brew_flow_profile',
      mime: 'application/json',
      size: 1007,
      checked_at: jasmine.any(Number),
    });
    expect(
      entryFor(manifest, 'importedGraph/brew-100_flow_profile.json'),
    ).toEqual(
      jasmine.objectContaining({
        owner_uuid: 'brew-100',
        kind: 'imported_flow_profile',
        size: 500,
      }),
    );
    // The path stays as the entry references it.
    expect(entryFor(manifest, '/bean-0.jpg')).toEqual(
      jasmine.objectContaining({
        collection: 'BEANS',
        owner_uuid: 'bean-0',
        kind: 'photo',
        mime: 'image/jpeg',
        size: 200_000,
      }),
    );
    expect(entryFor(manifest, 'graphs/graph-0.json')?.kind).toBe(
      'graph_flow_profile',
    );
    expect(entryFor(manifest, 'baristamode/barista-0.json')?.kind).toBe(
      'baristamode_flow_profile',
    );
    expect(setup.storages.BEANS.getAllEntries()[0].attachments).toEqual([
      '/bean-0.jpg',
    ]);
    service.stop();
  });

  it('gives files that do not exist no size', async () => {
    const setup = createSetup();
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0' }, attachments: ['missing.jpg'] },
    ]);
    const { service } = createService(setup);

    await startAndBuild(service);

    expect(storedManifest(setup).entries).toEqual([
      jasmine.objectContaining({ path: 'missing.jpg', size: null }),
    ]);
    service.stop();
  });

  it('looks up iOS photos without the Cloud folder', async () => {
    const setup = createSetup(['capacitor', 'ios']);
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0' }, attachments: ['Cloud/photo.png'] },
    ]);
    setup.files.set('DATA:photo.png', 7);
    const { service, statFile } = createService(setup);

    await startAndBuild(service);

    expect(statFile).toHaveBeenCalledWith('photo.png', 'DATA');
    expect(storedManifest(setup).entries).toEqual([
      jasmine.objectContaining({
        path: 'Cloud/photo.png',
        mime: 'image/png',
        size: 7,
      }),
    ]);
    service.stop();
  });

  it('continues a stopped build on the next start without listing a file twice', async () => {
    const setup = createSetup();
    fillSyntheticData(setup, 1200, 40);
    const total = 1200 + 12 + 40;
    const first = createService(setup);
    first.statFile.and.callFake(async (_path: string, _directory: string) => {
      if (first.statFile.calls.count() === 300) {
        // Like the app being closed in the middle of the build.
        first.service.stop();
      }
      await Promise.resolve();
      return { size: setup.files.get(_directory + ':' + _path) ?? 0 };
    });

    await startAndBuild(first.service);
    await first.service.flush();

    const partial = storedManifest(setup);
    expect(partial.completed_at).toBe(0);
    expect(partial.entries.length).toBeGreaterThanOrEqual(200);
    expect(partial.entries.length).toBeLessThan(total);

    const next = restart(setup);
    const second = createService(next);
    await startAndBuild(second.service);

    const manifest = storedManifest(next);
    expect(manifest.completed_at).toBeGreaterThan(0);
    expect(manifest.entries.length).toBe(total);
    expect(new Set(manifest.entries.map((_e) => _e.path)).size).toBe(total);
    expect(second.statFile.calls.count()).toBe(total - partial.entries.length);
    second.service.stop();
  });

  it('checks no file again on a start without changes', async () => {
    const setup = createSetup();
    fillSyntheticData(setup, 50, 5);
    const first = createService(setup);
    await startAndBuild(first.service);
    first.service.stop();

    const next = restart(setup);
    const second = createService(next);
    await startAndBuild(second.service);

    expect(second.statFile).not.toHaveBeenCalled();
    expect(storedManifest(next).entries.length).toBe(50 + 1 + 5);
    second.service.stop();
  });

  it('removes files that are no longer referenced on the next start', async () => {
    const setup = createSetup();
    fillSyntheticData(setup, 10, 2);
    const first = createService(setup);
    await startAndBuild(first.service);
    first.service.stop();

    const next = restart(setup);
    next.storages.BEANS.setEntries([
      { config: { uuid: 'bean-1' }, attachments: [] },
    ]);
    const second = createService(next);
    await startAndBuild(second.service);

    const paths = storedManifest(next).entries.map((_e) => _e.path);
    expect(paths).not.toContain('bean-1.jpg');
    expect(paths).not.toContain('/bean-0.jpg');
    expect(paths.length).toBe(10 + 1);
    second.service.stop();
  });

  it('checks the files of a changed entry again on the next start', async () => {
    const setup = createSetup();
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0', updated_at: 0 }, attachments: ['a.jpg'] },
    ]);
    setup.files.set('DATA:a.jpg', 1);
    const first = createService(setup);
    await startAndBuild(first.service);
    first.service.stop();

    const next = restart(setup);
    const bean = next.storages.BEANS.getAllEntries()[0];
    bean.config.updated_at = Date.now() + 60_000;
    next.files.set('DATA:a.jpg', 2);
    const second = createService(next);
    await startAndBuild(second.service);

    expect(second.statFile).toHaveBeenCalledTimes(1);
    expect(storedManifest(next).entries[0].size).toBe(2);
    second.service.stop();
  });

  it('adds the files of a new entry shortly after it was stored', fakeAsync(() => {
    const setup = createSetup();
    const { service } = createService(setup);
    void service.start();
    flush();

    let addedUuid = '';
    void setup.storages.BEANS.add({
      config: {},
      attachments: ['new.jpg'],
    }).then((_entry: { config: { uuid: string } }) => {
      addedUuid = _entry.config.uuid;
    });
    tick();
    setup.files.set('DATA:new.jpg', 1234);
    expect(service.getManifest().entries).toEqual([]);

    tick(AttachmentManifestService.OWNER_CHECK_DELAY_MS);
    expect(service.getManifest().entries).toEqual([
      jasmine.objectContaining({
        path: 'new.jpg',
        collection: 'BEANS',
        owner_uuid: addedUuid,
        size: 1234,
      }),
    ]);

    tick(AttachmentManifestService.SAVE_DELAY_MS);
    expect(storedManifest(setup).entries.length).toBe(1);
    service.stop();
    flush();
  }));

  it('waits for a flow profile written after the brew was updated', fakeAsync(() => {
    const setup = createSetup();
    setup.storages.BREWS.setEntries([
      { config: { uuid: 'brew-0' }, attachments: [], flow_profile: '' },
    ]);
    const { service } = createService(setup);
    void service.start();
    flush();

    const brew = structuredClone(setup.storages.BREWS.getAllEntries()[0]);
    brew.flow_profile = 'brews/brew-0_flow_profile.json';
    void setup.storages.BREWS.update(brew);
    tick(100);
    setup.files.set('DATA:brews/brew-0_flow_profile.json', 99);
    tick(AttachmentManifestService.OWNER_CHECK_DELAY_MS);

    expect(service.getManifest().entries).toEqual([
      jasmine.objectContaining({ kind: 'brew_flow_profile', size: 99 }),
    ]);
    service.stop();
    flush();
  }));

  it('removes the files of a deleted entry, but keeps those of a copy with the same uuid', fakeAsync(() => {
    const setup = createSetup();
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0' }, attachments: ['a.jpg'] },
      { config: { uuid: 'twin' }, attachments: ['t.jpg'] },
      { config: { uuid: 'twin' }, attachments: ['t.jpg'] },
    ]);
    setup.files.set('DATA:a.jpg', 1);
    setup.files.set('DATA:t.jpg', 2);
    const { service } = createService(setup);
    void service.start();
    flush();
    expect(service.getManifest().entries.length).toBe(2);

    void setup.storages.BEANS.removeByUUID('bean-0');
    void setup.storages.BEANS.removeByUUID('twin');
    flush();

    expect(service.getManifest().entries.map((_e) => _e.path)).toEqual([
      't.jpg',
    ]);
    expect(storedManifest(setup).entries.map((_e) => _e.path)).toEqual([
      't.jpg',
    ]);

    void setup.storages.BEANS.removeByUUID('twin');
    flush();
    expect(service.getManifest().entries).toEqual([]);
    service.stop();
    flush();
  }));

  it('checks every file again after the collections were reloaded by an import', fakeAsync(() => {
    const setup = createSetup();
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0', updated_at: 0 }, attachments: ['a.jpg'] },
    ]);
    setup.files.set('DATA:a.jpg', 1);
    const { service, statFile } = createService(setup);
    void service.start();
    flush();
    expect(statFile).toHaveBeenCalledTimes(1);

    // The import replaces the collection and the file, the entry keeps its
    // old change info.
    setup.database.data.set('BEANS', [
      { config: { uuid: 'bean-0', updated_at: 0 }, attachments: ['a.jpg'] },
      { config: { uuid: 'bean-1', updated_at: 0 }, attachments: ['b.jpg'] },
    ]);
    setup.files.set('DATA:a.jpg', 5);
    setup.files.set('DATA:b.jpg', 6);
    void setup.storages.BEANS.reinitializeStorage();
    tick(AttachmentManifestService.REBUILD_DELAY_MS - 1);
    expect(statFile).toHaveBeenCalledTimes(1);
    flush();

    expect(
      storedManifest(setup).entries.map((_e) => [_e.path, _e.size]),
    ).toEqual([
      ['a.jpg', 5],
      ['b.jpg', 6],
    ]);
    service.stop();
    flush();
  }));

  it('does nothing in the browser', async () => {
    const setup = createSetup(['desktop', 'mobileweb']);
    fillSyntheticData(setup, 10, 2);
    const { service, statFile } = createService(setup);
    const uiLog = TestBed.inject(UILog) as jasmine.SpyObj<UILog>;

    await startAndBuild(service);
    await setup.storages.BEANS.add({ config: {}, attachments: ['x.jpg'] });
    await new Promise((_resolve) => setTimeout(_resolve, 20));

    expect(service.isSupported()).toBeFalse();
    expect(statFile).not.toHaveBeenCalled();
    expect(setup.database.get).not.toHaveBeenCalledWith(
      ATTACHMENT_MANIFEST_STORAGE_KEY,
    );
    expect(storedManifest(setup)).toBeUndefined();
    expect(uiLog.error.calls.count()).toBe(0);
  });

  it('builds the list again when the stored one is not valid', async () => {
    const setup = createSetup();
    setup.database.data.set(ATTACHMENT_MANIFEST_STORAGE_KEY, {
      version: 99,
      entries: 'broken',
    });
    setup.storages.BEANS.setEntries([
      { config: { uuid: 'bean-0' }, attachments: ['a.jpg'] },
    ]);
    const { service } = createService(setup);

    await startAndBuild(service);

    expect(storedManifest(setup)).toEqual({
      version: 1,
      completed_at: jasmine.any(Number),
      entries: [jasmine.objectContaining({ path: 'a.jpg', size: null })],
    });
    service.stop();
  });
});
