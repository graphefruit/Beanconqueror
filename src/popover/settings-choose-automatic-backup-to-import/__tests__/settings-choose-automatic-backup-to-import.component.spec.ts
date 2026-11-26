import { provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, provideIonicAngular } from '@ionic/angular';

import { FileInfo } from '@capacitor/filesystem';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { PreImportBackupService } from '../../../services/preImportBackup/pre-import-backup.service';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIAlert } from '../../../services/uiAlert';
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
        { provide: ShareService, useValue: {} },
        { provide: UIAlert, useValue: {} },
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

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/** Ionic moves the name of ion-button to the button in its shadow root. */
function nameOf(_button: HTMLElement): string | null {
  return (
    _button.shadowRoot?.querySelector('button')?.getAttribute('aria-label') ??
    _button.getAttribute('aria-label')
  );
}

describe('Sharing a backup file from the list', () => {
  const beforeImport = file(
    'Beanconqueror_pre_import_2026-11-12_10-00-00-000Z.zip',
    500,
    Date.UTC(2026, 10, 12, 10),
  );
  const beforeDataUpdate = file(
    'Beanconqueror_pre_migration_UPDATE_16_2026-11-10_10-00-00-000Z.zip',
    700,
    Date.UTC(2026, 10, 10, 10),
  );
  let shareStoredFile: jasmine.Spy;
  let showMessage: jasmine.Spy;

  beforeEach(() => {
    shareStoredFile = jasmine.createSpy('shareStoredFile').and.resolveTo(true);
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZoneChangeDetection(),
        provideIonicAngular(),
        provideTranslateService(),
        { provide: ModalController, useValue: {} },
        {
          provide: UIFileHelper,
          useValue: {
            listAutomaticBackupFiles: () => Promise.resolve([]),
            statInternalFile: () => Promise.resolve(undefined),
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => ({ date_format: 'DD.MM.YYYY' }) },
        },
        {
          provide: PreImportBackupService,
          useValue: {
            list: () => Promise.resolve([beforeImport, beforeDataUpdate]),
          },
        },
        { provide: ShareService, useValue: { shareStoredFile } },
        { provide: UIAlert, useValue: { showMessage } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      BACKUP_BEFORE_DATA_UPDATE: 'Data before the update to 9.0',
      A11Y: { SHARE_BACKUP_FILE: 'Share {{name}} from {{date}}' },
    });
    translate.use('en');
  });

  let component: SettingsChooseAutomaticBackupToImportComponent;

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(
      SettingsChooseAutomaticBackupToImportComponent,
    );
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the share button of each backup by its label and day', async () => {
    const element = await render();

    const buttons = [
      ...element.querySelectorAll<StencilElement>('ion-item ion-button'),
    ];
    await Promise.all(buttons.map((_button) => _button.componentOnReady?.()));
    expect(buttons.map(nameOf)).toEqual([
      `Share ${beforeImport.name} from 12.11.2026`,
      'Share Data before the update to 9.0 from 10.11.2026',
    ]);
    expect(
      element.querySelectorAll('ion-item .field-label')[1].textContent,
    ).toBe('Data before the update to 9.0');
  });

  it('shares the file of the backup and says nothing more when it was shared or the dialog closed', async () => {
    const element = await render();

    (element.querySelectorAll('ion-item ion-button')[1] as HTMLElement).click();
    await Promise.resolve();

    expect(shareStoredFile).toHaveBeenCalledOnceWith(beforeDataUpdate.uri);
    expect(showMessage).not.toHaveBeenCalled();
    // Sharing does not choose the backup for the import.
    expect(component.importChoosenURI).toBe('');
  });

  it('tells the user when the backup could not be shared', async () => {
    shareStoredFile.and.resolveTo(false);
    const component = TestBed.runInInjectionContext(
      () => new SettingsChooseAutomaticBackupToImportComponent(),
    );

    await component.share(beforeImport.uri);

    expect(showMessage).toHaveBeenCalledOnceWith(
      'BACKUP_NOT_SHARED',
      undefined,
      undefined,
      true,
    );
  });
});
