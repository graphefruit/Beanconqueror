import { TestBed } from '@angular/core/testing';

import { FileInfo } from '@capacitor/filesystem';

import { UILog } from '../uiLog';
import {
  PRE_IMPORT_BACKUP_FILES,
  PreImportBackupFiles,
} from './pre-import-backup-files';
import {
  PRE_IMPORT_BACKUP_FOLDER,
  PRE_IMPORT_BACKUPS_KEPT,
  PreImportBackupService,
} from './pre-import-backup.service';

/** Path of the backup written at the given local time. */
function backupPath(_time: string): string {
  return `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_${_time}.zip`;
}

/** A file system that keeps the files of the app data directory in memory. */
function createFakeFiles(_paths: string[] = [], _available = true) {
  const stored = new Map<string, Blob>(
    _paths.map((_path) => [_path, new Blob([_path])]),
  );
  const failing = {
    write: false,
    list: false,
    remove: new Set<string>(),
  };
  const files: PreImportBackupFiles = {
    isAvailable: () => _available,
    write: (_path, _data) => {
      if (failing.write) {
        return Promise.reject(new Error('disk full'));
      }
      stored.set(_path, _data);
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
  it('writes the backup into its folder with the local time in the name', async () => {
    const fake = createFakeFiles();
    const { service } = setUp(fake.files);
    const zip = new Blob(['zip content']);

    const path = await service.write(zip, new Date(2026, 10, 3, 9, 5, 7, 42));

    expect(path).toBe(backupPath('2026-11-03_09-05-07-042'));
    expect(fake.stored.get(path)).toBe(zip);
  });

  it('rejects when the backup cannot be written', async () => {
    const fake = createFakeFiles();
    fake.failing.write = true;
    const { service } = setUp(fake.files);

    await expectAsync(service.write(new Blob(['zip']))).toBeRejectedWithError(
      'disk full',
    );
    expect(fake.stored.size).toBe(0);
  });

  it(`keeps the ${PRE_IMPORT_BACKUPS_KEPT} newest backups and no other file is touched`, async () => {
    const others = [
      `${PRE_IMPORT_BACKUP_FOLDER}/notes.txt`,
      `${PRE_IMPORT_BACKUP_FOLDER}/Beanconqueror_pre_import_copy.zip`,
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

    const written = await service.write(
      new Blob(['zip']),
      new Date(2026, 10, 13, 12, 0, 0, 0),
    );
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

  it('keeps the backup just written when a clock set back gives it the oldest name', async () => {
    const fake = createFakeFiles([
      backupPath('2026-11-01_10-00-00-000'),
      backupPath('2026-11-02_10-00-00-000'),
      backupPath('2026-11-03_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const written = await service.write(
      new Blob(['zip']),
      new Date(2020, 0, 1, 0, 0, 0, 0),
    );
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
      backupPath('2026-11-02_10-00-00-000'),
    ]);
    const { service } = setUp(fake.files);

    const listed = await service.list();

    expect(listed.map((_file) => _file.name)).toEqual([
      'Beanconqueror_pre_import_2026-11-03_10-00-00-000.zip',
      'Beanconqueror_pre_import_2026-11-02_10-00-00-000.zip',
      'Beanconqueror_pre_import_2026-11-01_10-00-00-000.zip',
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
