import { TestBed } from '@angular/core/testing';

import { FileInfo } from '@capacitor/filesystem';

import { UILog } from '../uiLog';
import {
  PRE_IMPORT_BACKUP_FILES,
  PreImportBackupFiles,
} from './pre-import-backup-files';
import {
  canBeImportedAgain,
  PRE_IMPORT_BACKUP_FOLDER,
  PRE_IMPORT_BACKUPS_KEPT,
  PreImportBackupService,
} from './pre-import-backup.service';

/** Path of the backup written at the given time in UTC. */
function backupPath(_time: string): string {
  return `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_${_time}Z.zip`;
}

/** Path of the backup of an unchanged import written at the given time in UTC. */
function importedBackupPath(_time: string): string {
  return `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_${_time}Z_imported.zip`;
}

/** A file system that keeps the files of the app data directory in memory. */
function createFakeFiles(_paths: string[] = [], _available = true) {
  const stored = new Map<string, Blob>(
    _paths.map((_path) => [_path, new Blob([_path])]),
  );
  const failing = {
    write: false,
    rename: false,
    list: false,
    remove: new Set<string>(),
  };
  const files: PreImportBackupFiles = {
    isAvailable: () => _available,
    write: (_path, _data) => {
      if (failing.write) {
        // Like Android, where the file is created before its content is
        // written and stays when writing fails.
        stored.set(_path, new Blob([]));
        return Promise.reject(new Error('disk full'));
      }
      stored.set(_path, _data);
      return Promise.resolve();
    },
    rename: (_from, _to) => {
      const data = stored.get(_from);
      if (failing.rename || data === undefined || stored.has(_to)) {
        return Promise.reject(new Error('not renamed'));
      }
      stored.delete(_from);
      stored.set(_to, data);
      return Promise.resolve();
    },
    list: (_folder) => {
      if (failing.list) {
        return Promise.reject(new Error('folder not readable'));
      }
      const found: FileInfo[] = [];
      for (const [path, data] of stored) {
        const name = path.substring(_folder.length + 1);
        if (path.startsWith(_folder + '/') && !name.includes('/')) {
          found.push({
            name,
            type: 'file',
            size: data.size,
            mtime: 0,
            uri: `file:///data/${path}`,
          });
        }
      }
      return Promise.resolve(found);
    },
    remove: (_path) => {
      if (failing.remove.has(_path)) {
        return Promise.reject(new Error('not removable'));
      }
      stored.delete(_path);
      return Promise.resolve();
    },
  };
  spyOn(files, 'list').and.callThrough();
  return { stored, failing, files };
}

function setUp(_files: PreImportBackupFiles) {
  const uiLog = {
    log: jasmine.createSpy('log'),
    info: jasmine.createSpy('info'),
    error: jasmine.createSpy('error'),
  };
  TestBed.configureTestingModule({
    providers: [
      PreImportBackupService,
      { provide: PRE_IMPORT_BACKUP_FILES, useValue: _files },
      { provide: UILog, useValue: uiLog },
    ],
  });
  return { service: TestBed.inject(PreImportBackupService), uiLog };
}

describe('PreImportBackupService', () => {
  it('writes the backup into its folder with the time in UTC in the name', async () => {
    const fake = createFakeFiles();
    const { service } = setUp(fake.files);
    const zip = new Blob(['zip content']);

    const path = await service.write(zip, {
      now: new Date(Date.UTC(2026, 10, 3, 9, 5, 7, 42)),
    });

    expect(path).toBe(backupPath('2026-11-03_09-05-07-042'));
    expect(fake.stored.get(path)).toBe(zip);
  });

  it('lists the backups by the time they were written, also when daylight saving time ends', async () => {
    // In Central Europe 02:30 summer time comes before 02:15 winter time on
    // 25 October 2026, as after a change of the time zone the local time can
    // go back as well. In UTC they are 00:30 and 01:15.
    const fake = createFakeFiles();
    const { service } = setUp(fake.files);
    const first = await service.write(new Blob(['first']), {
      now: new Date(Date.UTC(2026, 9, 25, 0, 30)),
    });
    const second = await service.write(new Blob(['second']), {
      now: new Date(Date.UTC(2026, 9, 25, 1, 15)),
    });

    expect((await service.list()).map((_file) => _file.uri)).toEqual([
      `file:///data/${second}`,
      `file:///data/${first}`,
    ]);
  });

  it('marks the name of a backup of an unchanged import', async () => {
    const fake = createFakeFiles();
    const { service } = setUp(fake.files);

    const path = await service.write(new Blob(['zip']), {
      unchangedImport: true,
      now: new Date(Date.UTC(2026, 10, 3, 9, 5, 7, 42)),
    });

    expect(path).toBe(importedBackupPath('2026-11-03_09-05-07-042'));
    expect(fake.stored.has(path)).toBeTrue();
  });

  it('rejects and leaves no file when the backup cannot be written', async () => {
    const fake = createFakeFiles();
    fake.failing.write = true;
    const { service } = setUp(fake.files);

    await expectAsync(service.write(new Blob(['zip']))).toBeRejectedWithError(
      'disk full',
    );
    expect(fake.stored.size).toBe(0);
  });

  it('rejects and leaves no file when the written backup cannot get its name', async () => {
    const fake = createFakeFiles();
    fake.failing.rename = true;
    const { service } = setUp(fake.files);

    await expectAsync(service.write(new Blob(['zip']))).toBeRejectedWithError(
      'not renamed',
    );
    expect(fake.stored.size).toBe(0);
  });

  it('never takes a file that was not written completely for a backup', async () => {
    // The app was closed while writing, or the file could not be removed.
    const older = [
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-11-02_10-00-00-000'),
    ];
    const unfinished = [
      `${backupPath('2026-11-03_10-00-00-000')}.part`,
      `${importedBackupPath('2026-11-04_10-00-00-000')}.part`,
    ];
    const fake = createFakeFiles([...older, ...unfinished]);
    const { service } = setUp(fake.files);

    expect((await service.list()).length).toBe(2);
    await service.removeOldBackups(backupPath('2026-11-05_10-00-00-000'));
    expect([...fake.stored.keys()].sort()).toEqual(
      [...older, ...unfinished].sort(),
    );

    // The next backup removes them before it is written.
    const written = await service.write(new Blob(['zip']), {
      now: new Date(Date.UTC(2026, 10, 6, 10, 0, 0, 0)),
    });
    expect([...fake.stored.keys()].sort()).toEqual([...older, written].sort());
  });

  it('writes the backup also when unfinished files cannot be removed', async () => {
    const unfinished = `${backupPath('2026-11-03_10-00-00-000')}.part`;
    const fake = createFakeFiles([
      unfinished,
      `${PRE_IMPORT_BACKUP_FOLDER}/notes.zip.part`,
    ]);
    fake.failing.remove.add(unfinished);
    const { service, uiLog } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']));

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        unfinished,
        `${PRE_IMPORT_BACKUP_FOLDER}/notes.zip.part`,
        written,
      ].sort(),
    );
    expect(uiLog.error).toHaveBeenCalledTimes(1);

    fake.failing.list = true;
    await expectAsync(
      service.write(new Blob(['zip']), { now: new Date(0) }),
    ).toBeResolved();
  });

  it(`keeps the ${PRE_IMPORT_BACKUPS_KEPT} newest backups and no other file is touched`, async () => {
    const others = [
      `${PRE_IMPORT_BACKUP_FOLDER}/notes.txt`,
      `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_copy.zip`,
      `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_copy_imported.zip`,
      'Beanconqueror.zip',
      `brews/${backupPath('2026-01-01_00-00-00-000')}`,
    ];
    const fake = createFakeFiles([
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-10-31_23-59-59-999'),
      backupPath('2026-11-02_08-30-00-000'),
      backupPath('2025-12-24_18-00-00-000'),
      ...others,
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']), {
      now: new Date(Date.UTC(2026, 10, 13, 12, 0, 0, 0)),
    });
    await service.removeOldBackups(written);

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        written,
        backupPath('2026-11-02_08-30-00-000'),
        backupPath('2026-11-01_10-00-00-000'),
        ...others,
      ].sort(),
    );
  });

  it('keeps the data from before several imports in a row', async () => {
    // Written before the first import, then before each next one, while
    // the data was still the one the import before had stored.
    const beforeFirstImport = backupPath('2026-11-13_10-00-00-000');
    const fake = createFakeFiles([
      beforeFirstImport,
      importedBackupPath('2026-11-13_10-01-00-000'),
      importedBackupPath('2026-11-13_10-02-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']), {
      unchangedImport: true,
      now: new Date(Date.UTC(2026, 10, 13, 10, 3, 0, 0)),
    });
    await service.removeOldBackups(written);

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        written,
        importedBackupPath('2026-11-13_10-02-00-000'),
        beforeFirstImport,
      ].sort(),
    );
  });

  it('keeps backups of data that was not just imported before those of unchanged imports', async () => {
    const fake = createFakeFiles([
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-11-02_10-00-00-000'),
      backupPath('2026-11-03_10-00-00-000'),
      importedBackupPath('2026-11-04_10-00-00-000'),
      importedBackupPath('2026-11-05_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']), {
      unchangedImport: true,
      now: new Date(Date.UTC(2026, 10, 6, 10, 0, 0, 0)),
    });
    await service.removeOldBackups(written);

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        written,
        backupPath('2026-11-03_10-00-00-000'),
        backupPath('2026-11-02_10-00-00-000'),
      ].sort(),
    );
  });

  it('keeps the data from before several imports in a row also when the backup just written is of changed data', async () => {
    const beforeFirstImport = backupPath('2026-11-01_10-00-00-000');
    const fake = createFakeFiles([
      beforeFirstImport,
      importedBackupPath('2026-11-02_10-00-00-000'),
      importedBackupPath('2026-11-03_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']), {
      now: new Date(Date.UTC(2026, 10, 4, 10, 0, 0, 0)),
    });
    await service.removeOldBackups(written);

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        written,
        beforeFirstImport,
        importedBackupPath('2026-11-03_10-00-00-000'),
      ].sort(),
    );
  });

  it('keeps the backup just written when a clock set back gives it the oldest name', async () => {
    const fake = createFakeFiles([
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-11-02_10-00-00-000'),
      backupPath('2026-11-03_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(new Blob(['zip']), {
      now: new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0)),
    });
    await service.removeOldBackups(written);

    expect([...fake.stored.keys()].sort()).toEqual(
      [
        written,
        backupPath('2026-11-02_10-00-00-000'),
        backupPath('2026-11-03_10-00-00-000'),
      ].sort(),
    );
  });

  it('never rejects when old backups cannot be listed or removed', async () => {
    const paths = [
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-11-02_10-00-00-000'),
      backupPath('2026-11-03_10-00-00-000'),
      backupPath('2026-11-04_10-00-00-000'),
    ];
    const fake = createFakeFiles(paths);
    const { service, uiLog } = setUp(fake.files);
    const written = backupPath('2026-11-05_10-00-00-000');

    fake.failing.list = true;
    await expectAsync(service.removeOldBackups(written)).toBeResolved();
    expect(fake.stored.size).toBe(paths.length);

    fake.failing.list = false;
    fake.failing.remove.add(paths[0]);
    await expectAsync(service.removeOldBackups(written)).toBeResolved();
    // The oldest one could not be removed, the next one still is.
    expect(fake.stored.has(paths[0])).toBeTrue();
    expect(fake.stored.has(paths[1])).toBeFalse();
    expect(uiLog.error).toHaveBeenCalledTimes(2);
  });

  it('lists the backups newest first, without other files', async () => {
    const fake = createFakeFiles([
      backupPath('2026-11-01_10-00-00-000'),
      `${PRE_IMPORT_BACKUP_FOLDER}/notes.txt`,
      backupPath('2026-11-03_10-00-00-000'),
      importedBackupPath('2026-11-02_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const listed = await service.list();

    expect(listed.map((_file) => _file.name)).toEqual([
      'Beanconqueror_pre_import_2026-11-03_10-00-00-000Z.zip',
      'Beanconqueror_pre_import_2026-11-02_10-00-00-000Z_imported.zip',
      'Beanconqueror_pre_import_2026-11-01_10-00-00-000Z.zip',
    ]);
    expect(listed[0].uri).toBe(
      `file:///data/${backupPath('2026-11-03_10-00-00-000')}`,
    );
  });

  it('lists nothing when the backups cannot be listed', async () => {
    const fake = createFakeFiles([backupPath('2026-11-01_10-00-00-000')]);
    fake.failing.list = true;
    const { service } = setUp(fake.files);

    expect(await service.list()).toEqual([]);
  });

  it('is not available in the browser and lists nothing there', async () => {
    const fake = createFakeFiles(
      [backupPath('2026-11-01_10-00-00-000')],
      false,
    );
    const { service, uiLog } = setUp(fake.files);

    expect(service.isAvailable()).toBeFalse();
    expect(await service.list()).toEqual([]);
    expect(fake.files.list).not.toHaveBeenCalled();
    expect(uiLog.error).not.toHaveBeenCalled();
  });
});

describe('Whether an imported file can be imported again', () => {
  /** Milliseconds since epoch of the given local time. */
  function at(_day: number, _month: number, _hour = 12): number {
    return new Date(2026, _month - 1, _day, _hour).getTime();
  }

  function automaticBackup(_day: string): string {
    return `Beanconqueror_automatic_export_${_day}.zip`;
  }

  const NOW = at(13, 11);

  it('holds for a file with a name the app does not write', () => {
    expect(canBeImportedAgain('Beanconqueror 2.zip', at(13, 11, 9), NOW)).toBe(
      true,
    );
  });

  it('never holds for Beanconqueror.zip, the name of the internal backup and of every export', () => {
    expect(canBeImportedAgain('Beanconqueror.zip', at(13, 11, 9), NOW)).toBe(
      false,
    );
  });

  it('never holds for a backup written before an import, which the rotation deletes', () => {
    for (const path of [
      backupPath('2026-11-13_08-00-00-000'),
      importedBackupPath('2026-11-13_08-00-00-000'),
    ]) {
      const name = path.substring(path.lastIndexOf('/') + 1);
      expect(canBeImportedAgain(name, at(13, 11, 9), NOW))
        .withContext(name)
        .toBe(false);
    }
  });

  it('never holds when the name is not known', () => {
    for (const name of [undefined, null, '', 42]) {
      expect(canBeImportedAgain(name, at(13, 11, 9), NOW))
        .withContext(String(name))
        .toBe(false);
    }
  });

  it('does not hold for the automatic backup of the day of the import, which that day replaces', () => {
    expect(
      canBeImportedAgain(automaticBackup('13_11_2026'), at(13, 11, 9), NOW),
    ).toBe(false);
    // Also not on a later day: it was replaced after the import.
    expect(
      canBeImportedAgain(automaticBackup('10_11_2026'), at(10, 11, 23), NOW),
    ).toBe(false);
  });

  it('holds for the automatic backup of an earlier day until the app deletes it a week later', () => {
    expect(
      canBeImportedAgain(automaticBackup('12_11_2026'), at(13, 11, 9), NOW),
    ).toBe(true);
    expect(
      canBeImportedAgain(automaticBackup('06_11_2026'), at(13, 11, 9), NOW),
    ).toBe(true);
    expect(
      canBeImportedAgain(automaticBackup('05_11_2026'), at(13, 11, 9), NOW),
    ).toBe(false);
    // Imported while it was kept, deleted at a start since.
    expect(
      canBeImportedAgain(automaticBackup('05_11_2026'), at(10, 11), NOW),
    ).toBe(false);
  });

  it('does not hold for a name of an automatic backup without a day', () => {
    expect(
      canBeImportedAgain(
        'Beanconqueror_automatic_export_12_11_2026 (1).zip',
        at(13, 11, 9),
        NOW,
      ),
    ).toBe(false);
  });
});
