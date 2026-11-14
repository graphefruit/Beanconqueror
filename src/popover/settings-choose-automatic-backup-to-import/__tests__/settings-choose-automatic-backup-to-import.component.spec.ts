import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { FileInfo } from '@capacitor/filesystem';

import { PreImportBackupService } from '../../../services/preImportBackup/pre-import-backup.service';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { SettingsChooseAutomaticBackupToImportComponent } from '../settings-choose-automatic-backup-to-import.component';

function file(_name: string, _size: number): FileInfo {
  return {
    name: _name,
    size: _size,
    type: 'file',
    mtime: 0,
    uri: `file:///data/${_name}`,
  };
}

describe('Choosing an automatic backup file to import', () => {
  const automatic = [
    file('Beanconqueror_automatic_export_12_11_2026.zip', 300),
  ];
  const beforeImport = [
    file('Beanconqueror_pre_import_2026-11-13_10-00-00-000Z.zip', 500),
    file('Beanconqueror_pre_import_2026-11-12_10-00-00-000Z.zip', 100),
  ];

  async function listedFiles(_internalBackup?: FileInfo): Promise<FileInfo[]> {
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
        { provide: UIHelper, useValue: {} },
        {
          provide: PreImportBackupService,
          useValue: { list: () => Promise.resolve(beforeImport) },
        },
      ],
    });
    const component = TestBed.runInInjectionContext(
      () => new SettingsChooseAutomaticBackupToImportComponent(),
    );

    await component.ngOnInit();
    return component.foundBackupFiles;
  }

  it('also offers the backups saved before an import', async () => {
    // Sorted by size as before, the biggest file first.
    expect(await listedFiles()).toEqual([
      beforeImport[0],
      automatic[0],
      beforeImport[1],
    ]);
  });

  it('offers the internal backup first, as it normally holds the newest data', async () => {
    const internalBackup = file('Beanconqueror.zip', 200);

    expect(await listedFiles(internalBackup)).toEqual([
      internalBackup,
      beforeImport[0],
      automatic[0],
      beforeImport[1],
    ]);
  });
});
