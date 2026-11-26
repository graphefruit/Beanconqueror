import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { FileInfo } from '@capacitor/filesystem';

import { PreImportBackupService } from '../../../services/preImportBackup/pre-import-backup.service';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  fileSize,
  SettingsChooseAutomaticBackupToImportComponent,
} from '../settings-choose-automatic-backup-to-import.component';

function file(_name: string, _size: number, _mtime: number): FileInfo {
  return {
    name: _name,
    size: _size,
    type: 'file',
    mtime: _mtime,
    uri: `file:///data/${_name}`,
  };
}

describe('Choosing an automatic backup file to import', () => {
  const automatic = [
    file(
      'Beanconqueror_automatic_export_12_11_2026.zip',
      300,
      Date.UTC(2026, 10, 12, 18),
    ),
  ];
  const beforeImport = [
    file(
      'Beanconqueror_pre_import_2026-11-12_10-00-00-000Z.zip',
      500,
      Date.UTC(2026, 10, 12, 10),
    ),
    file(
      'Beanconqueror_pre_import_2026-11-13_10-00-00-000Z.zip',
      100,
      Date.UTC(2026, 10, 13, 10),
    ),
  ];

  const beforeDataUpdate = file(
    'Beanconqueror_pre_migration_UPDATE_16_2026-11-10_10-00-00-000Z.zip',
    700,
    Date.UTC(2026, 10, 10, 10),
  );

  async function listedEntries(
    _internalBackup?: FileInfo,
    _beforeImport: FileInfo[] = beforeImport,
  ) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ModalController, useValue: {} },
        {
          provide: UIFileHelper,
          useValue: {
            listAutomaticBackupFiles: () => Promise.resolve(automatic),
            statInternalFile: (_name: string) =>
              Promise.resolve(
                _name === 'Beanconqueror.zip' ? _internalBackup : undefined,
              ),
          },
        },
        { provide: UISettingsStorage, useValue: { getSettings: () => ({}) } },
        {
          provide: PreImportBackupService,
          useValue: { list: () => Promise.resolve(_beforeImport) },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(
      () => new SettingsChooseAutomaticBackupToImportComponent(),
    );

    await component.ngOnInit();
    return component.foundBackupFiles;
  }

  async function listedFiles(_internalBackup?: FileInfo): Promise<FileInfo[]> {
    return (await listedEntries(_internalBackup)).map((_entry) => _entry.file);
  }

  it('labels the backup written before the data updates instead of showing its name', async () => {
    const entries = await listedEntries(undefined, [
      beforeDataUpdate,
      ...beforeImport,
    ]);

    expect(
      entries.map((_entry) => [_entry.file.name, _entry.beforeDataUpdate]),
    ).toEqual([
      [beforeImport[1].name, false],
      [automatic[0].name, false],
      [beforeImport[0].name, false],
      [beforeDataUpdate.name, true],
    ]);
  });

  it('offers the backups saved before an import too, the newest file first', async () => {
    expect(await listedFiles()).toEqual([
      beforeImport[1],
      automatic[0],
      beforeImport[0],
    ]);
  });

  it('offers the internal backup first, as it normally holds the newest data', async () => {
    // Older than every other file and still first.
    const internalBackup = file(
      'Beanconqueror.zip',
      200,
      Date.UTC(2026, 10, 11, 10),
    );

    expect(await listedFiles(internalBackup)).toEqual([
      internalBackup,
      beforeImport[1],
      automatic[0],
      beforeImport[0],
    ]);
  });

  it('shows a small backup in kB instead of 0 MB', () => {
    expect(fileSize(4410)).toBe('5kB');
    expect(fileSize(24718)).toBe('0.02MB');
    expect(fileSize(1021246)).toBe('0.97MB');
  });
});
