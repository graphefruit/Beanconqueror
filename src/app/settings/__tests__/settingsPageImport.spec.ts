import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { PreImportBackupError } from '../../../services/preImportBackup/pre-import-backup.service';
import { SettingsPage } from '../settings.page';

describe('SettingsPage standard mill after an import', () => {
  function pageWith(brews: Brew[], mills: unknown[]) {
    const uiBrewStorage = {
      getAllEntries: () => brews,
      update: jasmine.createSpy('update').and.resolveTo(true),
    };
    const uiMillStorage = {
      getAllEntries: () => mills,
      add: jasmine
        .createSpy('add')
        .and.callFake(async (entry: unknown) => structuredClone(entry)),
    };
    // Only the two storages are needed; the page itself is not rendered.
    const page = Object.create(SettingsPage.prototype);
    page.uiBrewStorage = uiBrewStorage;
    page.uiMillStorage = uiMillStorage;
    return { page, uiBrewStorage, uiMillStorage };
  }

  it('points imported brews at the mill without touching their change info', async () => {
    const brews = [new Brew(), new Brew()];
    const { page, uiBrewStorage, uiMillStorage } = pageWith(brews, []);

    await page.__addStandardMillAfterImport();

    expect(uiMillStorage.add).toHaveBeenCalledTimes(1);
    expect(uiBrewStorage.update).toHaveBeenCalledTimes(2);
    for (const args of uiBrewStorage.update.calls.allArgs()) {
      expect(args[1]).toEqual({ touch: false });
    }
  });

  it('leaves brews alone when mills already exist', async () => {
    const { page, uiBrewStorage, uiMillStorage } = pageWith([new Brew()], [{}]);

    await page.__addStandardMillAfterImport();

    expect(uiMillStorage.add).not.toHaveBeenCalled();
    expect(uiBrewStorage.update).not.toHaveBeenCalled();
  });
});

describe('SettingsPage importing a backup file', () => {
  function pageWith(_options: {
    savesBackup: boolean;
    choice: 'YES' | 'NO';
    importBackup?: jasmine.Spy;
  }) {
    const storage = (_path: string) => ({ getDBPath: () => _path });
    const uiAlert = jasmine.createSpyObj('UIAlert', {
      showLoadingSpinner: Promise.resolve(),
      hideLoadingSpinner: Promise.resolve(),
      showMessage: Promise.resolve(),
      showConfirm: Promise.resolve(_options.choice),
    });
    const uiExportImportHelper = {
      savesBackupBeforeImport: () => _options.savesBackup,
      // A rolled back import ends the import without reloading the storages.
      importBackup:
        _options.importBackup ??
        jasmine.createSpy('importBackup').and.resolveTo({ BACKUP: true }),
    };
    // Only what the import of a parsed file uses; the page is not rendered.
    const page = Object.create(SettingsPage.prototype);
    Object.assign(page, {
      uiAlert,
      uiExportImportHelper,
      uiLog: { log: () => undefined, error: () => undefined },
      platform: { is: () => false },
      translate: { instant: (_key: string) => _key },
      uiHelper: { copyData: <T>(_value: T): T => structuredClone(_value) },
      settings: new Settings(),
      uiPreparationStorage: storage('PREPARATION'),
      uiBeanStorage: storage('BEANS'),
      uiBrewStorage: storage('BREWS'),
      uiSettingsStorage: storage('SETTINGS'),
      uiRoastingMachineStorage: storage('ROASTING_MACHINES'),
      uiGreenBeanStorage: storage('GREEN_BEANS'),
      uiWaterStorage: storage('WATER'),
      uiVersionStorage: storage('VERSION'),
      uiGraphStorage: storage('GRAPH'),
    });
    return { page, uiAlert, importBackup: uiExportImportHelper.importBackup };
  }

  function parsedBackup() {
    return {
      SETTINGS: [{ brew_view: 0, brew_order: { before: {} } }],
      BREWS: [],
    };
  }

  it('asks before the import and says where the current data is saved', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: true,
      choice: 'YES',
    });
    const backup = parsedBackup();

    await page.__importJSON(backup, '');

    expect(uiAlert.showConfirm).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_HINT',
      'IMPORT_REPLACE_ALL_DATA_QUESTION',
      true,
    );
    // No spinner while the question is open, the import starts after it.
    expect(
      uiAlert.hideLoadingSpinner.calls.first().invocationOrder,
    ).toBeLessThan(uiAlert.showConfirm.calls.first().invocationOrder);
    expect(uiAlert.showConfirm).toHaveBeenCalledBefore(importBackup);
    expect(importBackup).toHaveBeenCalledOnceWith(backup, 'import');
  });

  it('says that no backup file is written in the browser', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: false,
      choice: 'YES',
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showConfirm).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_HINT_BROWSER',
      'IMPORT_REPLACE_ALL_DATA_QUESTION',
      true,
    );
    expect(importBackup).toHaveBeenCalledTimes(1);
  });

  it('imports nothing when the question is declined', async () => {
    const { page, uiAlert, importBackup } = pageWith({
      savesBackup: true,
      choice: 'NO',
    });

    await page.__importJSON(parsedBackup(), '');

    expect(importBackup).not.toHaveBeenCalled();
    expect(uiAlert.showLoadingSpinner).not.toHaveBeenCalled();
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  it('says that nothing was imported when the current data could not be saved', async () => {
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.rejectWith(new PreImportBackupError(new Error('disk full'))),
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.hideLoadingSpinner).toHaveBeenCalled();
    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'PRE_IMPORT_BACKUP_FAILED',
    );
  });

  it('keeps the message for other failures of the import', async () => {
    const { page, uiAlert } = pageWith({
      savesBackup: true,
      choice: 'YES',
      importBackup: jasmine
        .createSpy('importBackup')
        .and.rejectWith({ BACKUP: true }),
    });

    await page.__importJSON(parsedBackup(), '');

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
    );
  });
});
