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
const SUMMARY = 'Beanconqueror.zip.meta.json';

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

/** The same with all an automatic backup wants before it writes. */
function storedDataToBackUp(_brews: number): Record<string, unknown> {
  return {
    ...storedData(_brews),
    MILL: [{ config: { uuid: 'mill-1' } }],
    PREPARATION: [{ config: { uuid: 'preparation-1' } }],
    BEANS: [{ config: { uuid: 'bean-1' } }],
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

/**
 * The app on a device storing `_stored`, with `_files` in its data
 * directory. Without `_readable` the database cannot be read, and the
 * list of backups offered then stays open. `_mtimes` are the times of
 * change of some of the files.
 */
async function startApp(
  _stored: Record<string, unknown>,
  _files: Record<string, Uint8Array> = {},
  _readable = true,
  _mtimes: Record<string, number> = {},
) {
  const files = new Map(Object.entries(_files));
  /** Time of the last change of each file, which a rename keeps. */
  const mtimes = new Map<string, number>();
  let clock = 1700000000000;
  for (const name of files.keys()) {
    mtimes.set(name, name in _mtimes ? _mtimes[name] : ++clock);
  }
  const errors: unknown[] = [];
  /** The files in the data directory each time the list was opened. */
  const filesWhenBackupsOffered: string[][] = [];
  const renameInternalFile = jasmine
    .createSpy('renameInternalFile')
    .and.callFake((_from: string, _to: string) => {
      files.set(_to, files.get(_from));
      files.delete(_from);
      mtimes.set(_to, mtimes.get(_from));
      mtimes.delete(_from);
      return Promise.resolve();
    });
  /** As UIFileHelper.replaceFileFromBlob: the unfinished file goes first. */
  const replaceInternalFileFromBlob = jasmine
    .createSpy('replaceInternalFileFromBlob')
    .and.callFake(async (_blob: Blob, _path: string, _unfinished: string) => {
      files.delete(_unfinished);
      files.set(_path, new Uint8Array(await _blob.arrayBuffer()));
      mtimes.set(_path, ++clock);
    });
  const readInternalFileAsUint8Array = jasmine
    .createSpy('readInternalFileAsUint8Array')
    .and.callFake((_name: string) =>
      files.has(_name)
        ? Promise.resolve(files.get(_name))
        : Promise.reject(new Error('File does not exist')),
    );
  const deleteInternalFile = jasmine
    .createSpy('deleteInternalFile')
    .and.callFake((_name: string) =>
      files.delete(_name)
        ? Promise.resolve()
        : Promise.reject(new Error('File does not exist')),
    );
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
            Promise.resolve(
              files.has(_name)
                ? {
                    name: _name,
                    size: files.get(_name).length,
                    mtime: mtimes.get(_name),
                  }
                : undefined,
            ),
          readInternalFileAsUint8Array,
          readInternalFileAsText: (_name: string) =>
            files.has(_name)
              ? Promise.resolve(new TextDecoder().decode(files.get(_name)))
              : Promise.reject(new Error('File does not exist')),
          deleteInternalFile,
          readInternalJSONFile: () =>
            Promise.reject(new Error('File does not exist')),
          renameInternalFile,
          replaceInternalFileFromBlob,
          replaceFileFromBlob: () => Promise.resolve(),
        },
      },
      {
        provide: UISettingsStorage,
        useValue: {
          getSettings: () => ({ show_backup_issues: false }),
        },
      },
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
    mtimes,
    errors,
    readInternalFileAsUint8Array,
    deleteInternalFile,
    renameInternalFile,
    replaceInternalFileFromBlob,
    helper,
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

describe('A complete internal backup that did not get its name', () => {
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

  it('gets the name before the next automatic backup deletes it, so a failed write leaves a backup', async () => {
    const data = storedDataToBackUp(20);
    const complete = await writeBackupFile(data);
    const { helper, files, replaceInternalFileFromBlob } = await startApp(
      data,
      { [UNFINISHED]: complete },
    );
    replaceInternalFileFromBlob.and.callFake(
      (_blob: Blob, _path: string, _unfinished: string) => {
        files.delete(_unfinished);
        return Promise.reject(new Error('write failed'));
      },
    );

    await helper.saveAutomaticBackups();

    expect(replaceInternalFileFromBlob).toHaveBeenCalledTimes(1);
    expect([...files.keys()]).toEqual([BACKUP]);
    expect(files.get(BACKUP)).toBe(complete);
  });

  it('is replaced by the next automatic backup when that one is written', async () => {
    const data = storedDataToBackUp(20);
    const complete = await writeBackupFile(storedDataToBackUp(10));
    const { helper, files, errors } = await startApp(data, {
      [UNFINISHED]: complete,
    });

    await helper.saveAutomaticBackups();

    expect([...files.keys()]).toEqual([BACKUP, SUMMARY]);
    expect(files.get(BACKUP)).not.toBe(complete);
    expect(errors).toEqual([]);
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

describe('The summary of the internal backup', () => {
  /** The files a device storing `_data` has once its backup was written. */
  async function backedUp(_data: Record<string, unknown>) {
    const { helper, files, mtimes, errors } = await startApp(_data);
    await helper.saveAutomaticBackups();
    expect(errors).toEqual([]);
    return {
      files: Object.fromEntries(files),
      mtimes: Object.fromEntries(mtimes),
    };
  }

  function summaryOf(_files: Record<string, Uint8Array>): any {
    return JSON.parse(new TextDecoder().decode(_files[SUMMARY]));
  }

  function withSummary(
    _files: Record<string, Uint8Array>,
    _change: (_summary: any) => void,
  ): Record<string, Uint8Array> {
    const summary = summaryOf(_files);
    _change(summary);
    return {
      ..._files,
      [SUMMARY]: new TextEncoder().encode(JSON.stringify(summary)),
    };
  }

  /** Starts a device storing `_stored` with `_files`; true when the backup was read. */
  async function startWith(
    _stored: Record<string, unknown>,
    _files: Record<string, Uint8Array>,
    _mtimes: Record<string, number>,
  ) {
    const app = await startApp(_stored, _files, true, _mtimes);
    await app.start();
    return {
      ...app,
      backupRead: app.readInternalFileAsUint8Array.calls
        .allArgs()
        .some(([_name]) => _name === BACKUP),
    };
  }

  it('is written once the backup has its name, with its counts, size and time of change', async () => {
    const { helper, files, mtimes, replaceInternalFileFromBlob } =
      await startApp(storedDataToBackUp(20));

    await helper.saveAutomaticBackups();

    expect(
      replaceInternalFileFromBlob.calls
        .allArgs()
        .map(([, _path, _unfinished]): unknown[] => [_path, _unfinished]),
    ).toEqual([
      [BACKUP, UNFINISHED],
      [SUMMARY, `${SUMMARY}.part`],
    ]);
    expect(summaryOf(Object.fromEntries(files))).toEqual({
      version: 1,
      size: files.get(BACKUP).length,
      mtime: mtimes.get(BACKUP),
      counts: { BEANS: 1, BREWS: 20, PREPARATION: 1, MILL: 1 },
    });
  });

  it('counts the copies of an entry, so the backup never holds more than it says', async () => {
    const data = storedDataToBackUp(20);
    const brews = data.BREWS as unknown[];
    brews.push(structuredClone(brews[0]));

    const { files } = await backedUp(data);

    expect(summaryOf(files).counts.BREWS).toBe(21);
  });

  it('is not written when a counted collection is no list, as the backup could hold more', async () => {
    const { helper, files, deleteInternalFile } = await startApp({
      ...storedDataToBackUp(0),
      MILL: 'no list',
    });

    await helper.saveAutomaticBackups();

    expect([...files.keys()]).toEqual([BACKUP]);
    expect(deleteInternalFile).toHaveBeenCalledOnceWith(SUMMARY);
  });

  it('spares reading the backup when the device holds as much', async () => {
    const data = storedDataToBackUp(20);
    const { files, mtimes } = await backedUp(data);

    const { backupRead, popover, importBackup } = await startWith(
      data,
      files,
      mtimes,
    );

    expect(backupRead).toBeFalse();
    expect(popover).not.toHaveBeenCalled();
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('lets the backup offer itself, read as before, when it holds more brews than the device', async () => {
    const data = storedDataToBackUp(30);
    const { files, mtimes } = await backedUp(data);

    const { backupRead, popover } = await startWith(
      storedDataToBackUp(20),
      files,
      mtimes,
    );

    expect(backupRead).toBeTrue();
    expect(popover).toHaveBeenCalledTimes(1);
    expect(popover.calls.mostRecent().args[1].BREWS).toEqual(data.BREWS);
  });

  for (const key of ['BEANS', 'PREPARATION', 'MILL']) {
    for (const withItsSummary of [true, false]) {
      it(`lets the backup offer itself when it holds more of ${key} than the device, ${withItsSummary ? 'with' : 'without'} a summary`, async () => {
        const data = storedDataToBackUp(20);
        data[key] = [
          ...(data[key] as unknown[]),
          { config: { uuid: `${key}-2` } },
        ];
        const backup = await backedUp(data);
        const files = withItsSummary
          ? backup.files
          : Object.fromEntries(
              Object.entries(backup.files).filter(
                ([_name]) => _name !== SUMMARY,
              ),
            );

        const { backupRead, popover } = await startWith(
          storedDataToBackUp(20),
          files,
          backup.mtimes,
        );

        expect(backupRead).toBeTrue();
        expect(popover).toHaveBeenCalledTimes(1);
        expect(popover.calls.mostRecent().args[1][key]).toEqual(data[key]);
      });
    }
  }

  it('lets the backup be restored into an empty database, read as before', async () => {
    const data = storedDataToBackUp(20);
    const { files, mtimes } = await backedUp(data);

    const { backupRead, importBackup } = await startWith({}, files, mtimes);

    expect(backupRead).toBeTrue();
    expect(importBackup).toHaveBeenCalledTimes(1);
    expect(
      (importBackup.calls.mostRecent().args[0] as { BREWS: unknown }).BREWS,
    ).toEqual(data.BREWS);
  });

  // The summary says the device holds as much: only the backup tells.
  for (const [kind, change] of [
    [
      'is missing',
      (_files: Record<string, Uint8Array>) =>
        Object.fromEntries(
          Object.entries(_files).filter(([_name]) => _name !== SUMMARY),
        ),
    ],
    [
      'cannot be read as JSON',
      (_files: Record<string, Uint8Array>) => ({
        ..._files,
        [SUMMARY]: new TextEncoder().encode('{"version":1,'),
      }),
    ],
    [
      'has an unknown version',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => (_summary.version = 2)),
    ],
    [
      'names another size',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => _summary.size++),
    ],
    [
      'names another time of change',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => _summary.mtime++),
    ],
    [
      'misses a count',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => delete _summary.counts.MILL),
    ],
    [
      'has a count that is no whole number',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => (_summary.counts.MILL = '1')),
    ],
    [
      'has a negative count',
      (_files: Record<string, Uint8Array>) =>
        withSummary(_files, (_summary) => (_summary.counts.BREWS = -1)),
    ],
  ] as const) {
    it(`is not used when it ${kind}, the backup is read`, async () => {
      const { files, mtimes } = await backedUp(storedDataToBackUp(30));
      const claimed = withSummary(
        files,
        (_summary) => (_summary.counts.BREWS = 20),
      );

      const { backupRead, popover } = await startWith(
        storedDataToBackUp(20),
        change(claimed),
        mtimes,
      );

      expect(backupRead).toBeTrue();
      expect(popover).toHaveBeenCalledTimes(1);
    });
  }

  it('is not used while the file gives no time of change', async () => {
    const { files, mtimes } = await backedUp(storedDataToBackUp(30));
    const claimed = withSummary(files, (_summary) => {
      _summary.counts.BREWS = 20;
      delete _summary.mtime;
    });

    const { backupRead, popover } = await startWith(
      storedDataToBackUp(20),
      claimed,
      { ...mtimes, [BACKUP]: undefined },
    );

    expect(backupRead).toBeTrue();
    expect(popover).toHaveBeenCalledTimes(1);
  });

  it('is not used for a backup of the same size taken over from the unfinished file', async () => {
    const { files, mtimes } = await backedUp(storedDataToBackUp(20));
    const unfinished = await writeBackupFile(storedDataToBackUp(30));
    // The new backup was not renamed when the app was ended, so the
    // summary is the one of the file before.
    const summary = withSummary(
      files,
      (_summary) => (_summary.size = unfinished.length),
    )[SUMMARY];

    const {
      backupRead,
      popover,
      files: after,
    } = await startWith(
      storedDataToBackUp(20),
      { [UNFINISHED]: unfinished, [SUMMARY]: summary },
      { [UNFINISHED]: mtimes[BACKUP] + 1, [SUMMARY]: mtimes[SUMMARY] },
    );

    expect(after.get(BACKUP)).toBe(unfinished);
    expect(backupRead).toBeTrue();
    expect(popover).toHaveBeenCalledTimes(1);
  });

  it('is deleted when it cannot be written, without a message', async () => {
    const { files, mtimes } = await backedUp(storedDataToBackUp(20));
    const app = await startApp(storedDataToBackUp(30), files, true, mtimes);
    const replace = app.replaceInternalFileFromBlob.and.callFake(
      async (_blob: Blob, _path: string) => {
        if (_path === SUMMARY) {
          throw new Error('disk full');
        }
        app.files.set(_path, new Uint8Array(await _blob.arrayBuffer()));
        app.mtimes.set(_path, mtimes[BACKUP] + 1);
      },
    );

    await app.helper.saveAutomaticBackups();

    expect(replace).toHaveBeenCalledTimes(2);
    expect(app.deleteInternalFile).toHaveBeenCalledOnceWith(SUMMARY);
    expect([...app.files.keys()]).toEqual([BACKUP]);
    expect(app.errors.length).toBe(1);
  });

  it('is deleted when the backup changed again before it was written', async () => {
    const { files, mtimes } = await backedUp(storedDataToBackUp(20));
    const app = await startApp(storedDataToBackUp(30), files, true, mtimes);
    app.replaceInternalFileFromBlob.and.callFake(
      (_blob: Blob, _path: string) => {
        // Another write replaced it by a file of another size.
        app.files.set(_path, new Uint8Array(0));
        return Promise.resolve();
      },
    );

    await app.helper.saveAutomaticBackups();

    expect(app.replaceInternalFileFromBlob).toHaveBeenCalledTimes(1);
    expect(app.deleteInternalFile).toHaveBeenCalledOnceWith(SUMMARY);
    expect(app.errors.length).toBe(1);
  });

  it('stays when the backup cannot be written, as the file before is left', async () => {
    const { files, mtimes } = await backedUp(storedDataToBackUp(20));
    const app = await startApp(storedDataToBackUp(30), files, true, mtimes);
    app.replaceInternalFileFromBlob.and.rejectWith(new Error('disk full'));

    await app.helper.saveAutomaticBackups();

    expect(app.files.get(SUMMARY)).toBe(files[SUMMARY]);
    expect(app.deleteInternalFile).not.toHaveBeenCalled();
    const { backupRead } = await startWith(
      storedDataToBackUp(20),
      Object.fromEntries(app.files),
      Object.fromEntries(app.mtimes),
    );
    expect(backupRead).toBeFalse();
  });
});
