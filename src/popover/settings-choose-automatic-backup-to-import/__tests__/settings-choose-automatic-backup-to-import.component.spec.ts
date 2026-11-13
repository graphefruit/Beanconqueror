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
  it('also offers the backups saved before an import', async () => {
    const automatic = [
      file('Beanconqueror_automatic_export_12_11_2026.zip', 300),
    ];
    const beforeImport = [
      file('Beanconqueror_pre_import_2026-11-13_10-00-00-000Z.zip', 500),
      file('Beanconqueror_pre_import_2026-11-12_10-00-00-000Z.zip', 100),
    ];
    TestBed.configureTestingModule({
      providers: [
        { provide: ModalController, useValue: {} },
        {
          provide: UIFileHelper,
          useValue: {
            listAutomaticBackupFiles: () => Promise.resolve(automatic),
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

    // Sorted by size as before, the biggest file first.
    expect(component.foundBackupFiles).toEqual([
      beforeImport[0],
      automatic[0],
      beforeImport[1],
    ]);
  });
});
