import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

import { EventQueueService } from '../queueService/queue-service.service';
import { UIAlert } from '../uiAlert';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIExportImportHelper } from '../uiExportImportHelper';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIStorage } from '../uiStorage';

const BACKUP = 'Beanconqueror.zip';
const UNFINISHED = 'Beanconqueror.zip.part';

/** What a device with `_brews` brews stores. */
function storedData(_brews: number): Record<string, unknown> {
  return {
    VERSION: [{ updatedDataVersions: ['UPDATE_1'] }],
    SETTINGS: [{ language: 'en' }],
    BREWS: Array.from({ length: _brews }, (_, i) => ({
      config: { uuid: `brew-${i}`, unix_timestamp: 1600000000 + i },
    })),
  };
}

function createDeviceDatabase(
  _stored: Record<string, unknown>,
  _readable: boolean,
) {
  const data = new Map<string, unknown>(
    Object.entries(structuredClone(_stored)),
  );
  if (!_readable) {
    const unreadable = () => Promise.reject(new Error('database not readable'));
    return { set: unreadable, get: unreadable, forEach: unreadable };
  }
  return {
    set: (key: string, value: unknown) => {
      data.set(key, structuredClone(value));
      return Promise.resolve();
    },
    get: (key: string) =>
      Promise.resolve(data.has(key) ? structuredClone(data.get(key)) : null),
    forEach: (cb: (value: unknown, key: string, i: number) => void) => {
      let i = 0;
      for (const [key, value] of data) {
        cb(structuredClone(value), key, i++);
      }
      return Promise.resolve();
    },
  };
}

describe('A complete internal backup that did not get its name', () => {
  /**
   * The app on a device storing `_stored`, with `_files` in its data
   * directory. Without `_readable` the database cannot be read, and the
   * list of backups offered then stays open.
   */
  async function startApp(
    _stored: Record<string, unknown>,
    _files: Record<string, Uint8Array> = {},
    _readable = true,
  ) {
    const files = new Map(Object.entries(_files));
    const errors: unknown[] = [];
    /** The files in the data directory each time the list was opened. */
    const filesWhenBackupsOffered: string[][] = [];
    const renameInternalFile = jasmine
      .createSpy('renameInternalFile')
      .and.callFake((_from: string, _to: string) => {
        files.set(_to, files.get(_from));
        files.delete(_from);
        return Promise.resolve();
      });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UIExportImportHelper,
        UIStorage,
        {
          provide: Storage,
          useValue: {
            create: () =>
              Promise.resolve(createDeviceDatabase(_stored, _readable)),
          },
        },
        { provide: EventQueueService, useValue: { dispatch: () => undefined } },
        {
          provide: UIHelper,
          useValue: { cloneData: <T>(v: T): T => structuredClone(v) },
        },
        // The internal backup is only checked in the app.
        {
          provide: Platform,
          useValue: { is: (_platform: string) => _platform === 'capacitor' },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            debug: () => undefined,
            error: (..._message: unknown[]) => errors.push(_message),
          },
        },
        {
          provide: UIFileHelper,
          useValue: {
            statInternalFile: (_name: string) =>
              Promise.resolve(files.has(_name) ? { name: _name } : undefined),
            readInternalFileAsUint8Array: (_name: string) =>
              files.has(_name)
                ? Promise.resolve(files.get(_name))
                : Promise.reject(new Error('File does not exist')),
            readInternalJSONFile: () =>
              Promise.reject(new Error('File does not exist')),
            renameInternalFile,
          },
        },
        { provide: UISettingsStorage, useValue: {} },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            showIOSIndexedDBIssues: () => Promise.resolve(),
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        {
          provide: ModalController,
          useValue: {
            create: () => {
              filesWhenBackupsOffered.push([...files.keys()]);
              return new Promise(() => undefined);
            },
          },
        },
      ],
    });
    await TestBed.inject(UIStorage).init();
    const helper = TestBed.inject(UIExportImportHelper);
    const popover = spyOn(helper, 'showDataCorruptionPopover').and.resolveTo(
      false,
    );
    const importBackup = spyOn(helper, 'importBackup').and.resolveTo({
      BACKUP: false,
    });
    /** The start as the app runs it. */
    const start = async () => {
      await helper.checkDatabaseReadable();
      await helper.checkBackup();
    };
    return {
      start,
      files,
      errors,
      renameInternalFile,
      popover,
      importBackup,
      filesWhenBackupsOffered,
    };
  }

  /** The backup file a device storing `_data` writes. */
  async function writeBackupFile(
    _data: Record<string, unknown>,
  ): Promise<Uint8Array> {
    await startApp(_data);
    const blob = await TestBed.inject(UIExportImportHelper).buildExportZIP();
    return new Uint8Array(await blob.arrayBuffer());
  }

  it('gets the name when there is no internal backup, and is restored into an empty database', async () => {
    const data = storedData(20);
    const complete = await writeBackupFile(data);
    const { start, files, errors, importBackup } = await startApp(
      {},
      { [UNFINISHED]: complete },
    );

    await start();

    expect([...files.keys()]).toEqual([BACKUP]);
    expect(files.get(BACKUP)).toBe(complete);
    expect(importBackup).toHaveBeenCalledTimes(1);
    const [imported, source] = importBackup.calls.mostRecent().args;
    expect((imported as { BREWS: unknown }).BREWS).toEqual(data.BREWS);
    expect(source).toBe('internal_backup');
    expect(errors).toEqual([]);
  });

  it('is then offered when it holds more brews than the database', async () => {
    const data = storedData(30);
    const complete = await writeBackupFile(data);
    const { start, popover } = await startApp(storedData(20), {
      [UNFINISHED]: complete,
    });

    await start();

    expect(popover).toHaveBeenCalledTimes(1);
    expect(popover.calls.mostRecent().args[1].BREWS).toEqual(data.BREWS);
  });

  it('is not offered when it holds fewer brews than the database', async () => {
    const complete = await writeBackupFile(storedData(10));
    const { start, files, errors, popover, importBackup } = await startApp(
      storedData(20),
      { [UNFINISHED]: complete },
    );

    await start();

    expect([...files.keys()]).toEqual([BACKUP]);
    expect(popover).not.toHaveBeenCalled();
    expect(importBackup).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it('has its name before the backups are offered for a database that cannot be read', async () => {
    // UIStorage waits 100 ms before it reads again; the test does not wait.
    const setTimeoutOriginal = window.setTimeout.bind(window) as (
      _handler: () => void,
      _ms?: number,
    ) => number;
    spyOn(window, 'setTimeout').and.callFake(((
      _handler: () => void,
      _ms?: number,
    ) =>
      setTimeoutOriginal(
        _handler,
        _ms === 100 ? 0 : _ms,
      )) as typeof window.setTimeout);
    const complete = await writeBackupFile(storedData(20));
    const { start, filesWhenBackupsOffered, importBackup } = await startApp(
      storedData(20),
      { [UNFINISHED]: complete },
      false,
    );

    // Stays at the list of backups, which reads only Beanconqueror.zip.
    void start();
    for (let i = 0; i < 100 && filesWhenBackupsOffered.length === 0; i++) {
      await new Promise((_resolve) => setTimeout(_resolve, 5));
    }

    expect(filesWhenBackupsOffered).toEqual([[BACKUP]]);
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('is left alone beside an internal backup, which is the one read', async () => {
    const data = storedData(20);
    const backup = await writeBackupFile(data);
    const unfinished = await writeBackupFile(storedData(30));
    const { start, files, renameInternalFile, popover, importBackup } =
      await startApp(data, { [BACKUP]: backup, [UNFINISHED]: unfinished });

    await start();

    expect(renameInternalFile).not.toHaveBeenCalled();
    expect(files.get(BACKUP)).toBe(backup);
    expect(files.get(UNFINISHED)).toBe(unfinished);
    // The brews of the unfinished file are not compared.
    expect(popover).not.toHaveBeenCalled();
    expect(importBackup).not.toHaveBeenCalled();
  });

  for (const [kind, cut] of [
    ['was cut off', (_file: Uint8Array) => _file.slice(0, _file.length / 2)],
    ['is no ZIP file', () => new TextEncoder().encode('no zip')],
    ['is empty', () => new Uint8Array()],
  ] as const) {
    it(`is neither renamed nor deleted when it ${kind}`, async () => {
      const unfinished = cut(await writeBackupFile(storedData(20)));
      const { start, files, errors, renameInternalFile, importBackup } =
        await startApp({}, { [UNFINISHED]: unfinished });

      await start();

      expect(renameInternalFile).not.toHaveBeenCalled();
      expect([...files.keys()]).toEqual([UNFINISHED]);
      expect(files.get(UNFINISHED)).toBe(unfinished);
      expect(importBackup).not.toHaveBeenCalled();
      expect(errors.length).toBe(1);
    });
  }

  it('lets the start go on without a backup when it cannot be renamed', async () => {
    const complete = await writeBackupFile(storedData(20));
    const { start, files, errors, renameInternalFile, importBackup } =
      await startApp({}, { [UNFINISHED]: complete });
    renameInternalFile.and.rejectWith(new Error('rename failed'));

    await expectAsync(start()).toBeResolved();

    expect(renameInternalFile).toHaveBeenCalledOnceWith(UNFINISHED, BACKUP);
    expect(files.get(UNFINISHED)).toBe(complete);
    expect(importBackup).not.toHaveBeenCalled();
    expect(errors.length).toBe(1);
  });

  it('does and logs nothing when there is neither file', async () => {
    const { start, errors, renameInternalFile, importBackup } = await startApp(
      {},
    );

    await start();

    expect(renameInternalFile).not.toHaveBeenCalled();
    expect(importBackup).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });
});
