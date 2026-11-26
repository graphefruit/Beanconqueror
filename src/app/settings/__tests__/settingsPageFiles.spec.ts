import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
// The plugin objects are proxies that cannot be spied on; the web
// implementations behind them can.
import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';
import { ShareWeb } from '@capacitor/share/dist/esm/web';
import { FilePickerWeb } from '@capawesome/capacitor-file-picker/dist/esm/web';
import { TextReader, Uint8ArrayWriter, ZipWriter } from '@zip.js/zip.js';

import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { NotABackupError } from '../../../services/backup-format-rules';
import { UIAlert } from '../../../services/uiAlert';
import { UIBaristamodeBrewStorage } from '../../../services/uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIExportImportHelper } from '../../../services/uiExportImportHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { UIGreenBeanStorage } from '../../../services/uiGreenBeanStorage';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';
import { UIWaterStorage } from '../../../services/uiWaterStorage';
import { StoreHub } from '../../../stores/core/store-hub';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { SettingsPage } from '../settings.page';

const EXPORT_DIR = 'Download/Beanconqueror_export';
const ZIP = 'the zip with the data';

/** A method of the web implementation, to call it from its replacement. */
function original(_name: 'mkdir' | 'writeFile' | 'copy') {
  const method = Object.getOwnPropertyDescriptor(FilesystemWeb.prototype, _name)
    .value as (this: FilesystemWeb, _options: unknown) => Promise<never>;
  // Whatever it resolves to is handed on untouched.
  return (_self: FilesystemWeb, _options: unknown) =>
    method.call(_self, _options) as Promise<never>;
}

/** Empties the files the web implementation keeps in IndexedDB. */
async function clearFiles(): Promise<void> {
  await (Filesystem as unknown as FilesystemWeb).clear();
}

async function write(
  _path: string,
  _text: string,
  _directory?: Directory,
): Promise<void> {
  await Filesystem.writeFile({
    path: _path,
    directory: _directory,
    data: _text,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

/** The text of the file, or undefined when there is none. */
async function read(
  _path: string,
  _directory?: Directory,
): Promise<string | undefined> {
  try {
    const { data } = await Filesystem.readFile({
      path: _path,
      directory: _directory,
      encoding: Encoding.UTF8,
    });
    return data as string;
  } catch {
    return undefined;
  }
}

/** The export folder and the folders of the graphs in it. */
async function makeFolders(_more: string[] = []): Promise<void> {
  for (const folder of [
    'brews',
    'graphs',
    'importedGraph',
    'baristamode',
    ..._more,
  ]) {
    await Filesystem.mkdir({
      path: `${EXPORT_DIR}/${folder}`,
      directory: Directory.External,
      recursive: true,
    });
  }
}

/** Every file below the folder, with its path from there. */
async function filesIn(_path: string, _directory?: Directory) {
  const found: string[] = [];
  const walk = async (_folder: string) => {
    let entries: { name: string; type: string }[];
    try {
      entries = (
        await Filesystem.readdir({ path: _folder, directory: _directory })
      ).files;
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = `${_folder}/${entry.name}`;
      if (entry.type === 'directory') {
        await walk(path);
      } else {
        found.push(path.substring(_path.length + 1));
      }
    }
  };
  await walk(_path);
  return found.sort();
}

const entry = (_uuid: string, _changes: object = {}) => ({
  config: { uuid: _uuid },
  attachments: [] as string[],
  ..._changes,
});

interface PageUnderTest {
  export(): Promise<void>;
  import(): Promise<void>;
  exportToSafDirectoryAndroid(): Promise<void>;
  importFromDirectoryAndroid(): Promise<void>;
  exportBrewByWeight(_type: string): Promise<void>;
  doWeHaveBrewByWeights(_type: string): boolean;
  pinFormatter(_value: unknown): string;
  doImport(
    _mode: string,
    _file: string,
    _directory: string,
    _name: string,
  ): Promise<void>;
  __importJSON(
    _parsed: unknown,
    _directory: string,
    _name: string,
  ): Promise<void>;
  _importFiles(_entries: unknown[], _directory: string): Promise<void>;
  _importFlowProfileFiles(
    _entries: unknown[],
    _directory: string,
  ): Promise<void>;
  _importGraphProfileFiles(
    _entries: unknown[],
    _directory: string,
  ): Promise<void>;
  _importBaristamodeFlowProfileFiles(
    _entries: unknown[],
    _directory: string,
  ): Promise<void>;
  __cleanupImportSettingsData(_settings: unknown): void;
  settings: unknown;
}

describe('SettingsPage files of an export and an import', () => {
  let database: MemoryDatabase;
  let page: PageUnderTest;
  let log: { error: jasmine.Spy; info: jasmine.Spy; log: jasmine.Spy };
  let showMessage: jasmine.Spy;
  let showMessageWithDetails: jasmine.Spy;
  let hideLoadingSpinner: jasmine.Spy;
  let showLoadingSpinner: jasmine.Spy;
  let share: jasmine.Spy;
  let buildExportZIP: jasmine.Spy;
  let exportBrewByWeightsSmall: jasmine.Spy;
  let storages: {
    beans: UIBeanStorage;
    brews: UIBrewStorage;
    preparations: UIPreparationStorage;
    mills: UIMillStorage;
    waters: UIWaterStorage;
    greenBeans: UIGreenBeanStorage;
    roastingMachines: UIRoastingMachineStorage;
    graphs: UIGraphStorage;
    baristaBrews: UIBaristamodeBrewStorage;
  };

  /** Seven collections with a photo each, graphs of every kind. */
  function seedDatabase(): void {
    database.values.set('BEANS', [
      entry('bean-1', { attachments: ['photo_bean.jpg', 'photo_bean2.png'] }),
    ]);
    database.values.set('BREWS', [
      entry('brew-1', {
        attachments: ['photo_brew.jpg'],
        flow_profile: 'brews/brew-1_flow_profile.json',
      }),
      entry('brew-2', {
        flow_profile: '',
        reference_flow_profile: { type: 'IMPORTED_GRAPH', uuid: 'x' },
      }),
      entry('brew-3', { reference_flow_profile: { type: 'BREW', uuid: 'y' } }),
    ]);
    database.values.set('PREPARATION', [
      entry('prep-1', { attachments: ['photo_prep.jpg'] }),
    ]);
    database.values.set('MILL', [
      entry('mill-1', { attachments: ['photo_mill.jpg'] }),
    ]);
    database.values.set('WATER', [
      entry('water-1', { attachments: ['photo_water.jpg'] }),
    ]);
    database.values.set('GREEN_BEANS', [
      entry('green-1', { attachments: ['photo_green.jpg'] }),
    ]);
    database.values.set('ROASTING_MACHINES', [
      entry('machine-1', { attachments: ['photo_machine.jpg'] }),
    ]);
    database.values.set('GRAPH', [
      entry('graph-1', { flow_profile: 'graphs/graph-1_flow_profile.json' }),
      entry('graph-2', { flow_profile: '' }),
    ]);
    database.values.set('BARISTAMODE_BREWS', [
      entry('barista-1', {
        flow_profile: 'baristamode/barista-1_flow_profile.json',
      }),
      entry('barista-2', { flow_profile: '' }),
    ]);
  }

  /** Every file the seeded entries refer to, with its path as content. */
  const SEEDED_FILES = [
    'baristamode/barista-1_flow_profile.json',
    'brews/brew-1_flow_profile.json',
    'graphs/graph-1_flow_profile.json',
    'importedGraph/brew-2_flow_profile.json',
    'photo_bean.jpg',
    'photo_bean2.png',
    'photo_brew.jpg',
    'photo_green.jpg',
    'photo_machine.jpg',
    'photo_mill.jpg',
    'photo_prep.jpg',
    'photo_water.jpg',
  ];

  async function createPage(_platforms: string[]): Promise<void> {
    const platform = {
      is: (_name: string) => _platforms.includes(_name),
      platforms: () => _platforms,
    };
    const alert = {
      showMessage,
      showMessageWithDetails,
      showLoadingSpinner,
      hideLoadingSpinner,
      withLoadingSpinner: <T>(_work: () => Promise<T>) => _work(),
    };
    const providers = database.providers();
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        UIFileHelper,
        { provide: Platform, useValue: platform },
      ],
    });
    log = TestBed.inject(UILog) as unknown as typeof log;
    storages = {
      beans: TestBed.inject(UIBeanStorage),
      brews: TestBed.inject(UIBrewStorage),
      preparations: TestBed.inject(UIPreparationStorage),
      mills: TestBed.inject(UIMillStorage),
      waters: TestBed.inject(UIWaterStorage),
      greenBeans: TestBed.inject(UIGreenBeanStorage),
      roastingMachines: TestBed.inject(UIRoastingMachineStorage),
      graphs: TestBed.inject(UIGraphStorage),
      baristaBrews: TestBed.inject(UIBaristamodeBrewStorage),
    };
    for (const storage of Object.values(storages)) {
      await storage.initializeStorage();
    }
    // Not created by Angular: the page injects some forty services, and
    // only the ones that are set here take part in moving files.
    const created = Object.create(SettingsPage.prototype) as Record<
      string,
      unknown
    >;
    Object.assign(created, {
      platform,
      isAndroid: _platforms.includes('android'),
      isIos: _platforms.includes('ios'),
      uiLog: log,
      uiAlert: alert,
      uiAnalytics: { trackEvent: () => undefined },
      translate: { instant: (_key: string) => _key },
      uiFileHelper: TestBed.inject(UIFileHelper),
      uiExportImportHelper: { buildExportZIP },
      storeHub: new StoreHub(),
      uiExcel: { exportBrewByWeightsSmall },
      // The standard grinder after an import has tests of its own.
      brewReferences: { addStandardMill: () => Promise.resolve(true) },
      uiBeanStorage: storages.beans,
      uiBrewStorage: storages.brews,
      uiPreparationStorage: storages.preparations,
      uiMillStorage: storages.mills,
      uiWaterStorage: storages.waters,
      uiGreenBeanStorage: storages.greenBeans,
      uiRoastingMachineStorage: storages.roastingMachines,
      uiGraphStorage: storages.graphs,
      uiBaristamodeBrewStorage: storages.baristaBrews,
    });
    page = created as unknown as PageUnderTest;
  }

  const android = () => createPage(['capacitor', 'android']);
  const ios = () => createPage(['capacitor', 'ios']);

  /** The texts the page asks for, with the values it fills in. */
  function watchTexts(): jasmine.Spy {
    const instant = jasmine
      .createSpy('instant')
      .and.callFake((_key: string) => _key);
    Object.assign(page, { translate: { instant } });
    return instant;
  }

  beforeEach(async () => {
    await clearFiles();
    database = new MemoryDatabase();
    (
      StorageClass as unknown as { refusedWriteReported: boolean }
    ).refusedWriteReported = false;
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    showMessageWithDetails = jasmine
      .createSpy('showMessageWithDetails')
      .and.resolveTo();
    showLoadingSpinner = jasmine
      .createSpy('showLoadingSpinner')
      .and.resolveTo();
    hideLoadingSpinner = jasmine
      .createSpy('hideLoadingSpinner')
      .and.resolveTo();
    buildExportZIP = jasmine
      .createSpy('buildExportZIP')
      .and.callFake(() => Promise.resolve(new Blob([ZIP])));
    exportBrewByWeightsSmall = jasmine
      .createSpy('exportBrewByWeightsSmall')
      .and.resolveTo();
    share = spyOn(ShareWeb.prototype, 'share').and.resolveTo({});
    // A folder that is there already: the device answers with this code,
    // which the file helper ignores; the browser build has no codes.
    const mkdir = original('mkdir');
    spyOn(FilesystemWeb.prototype, 'mkdir').and.callFake(function (
      this: FilesystemWeb,
      _options,
    ) {
      return mkdir(this, _options).catch((_error: Error) => {
        throw _error.message.includes('already exist')
          ? Object.assign(_error, { code: 'OS-PLUG-FILE-0010' })
          : _error;
      });
    });
  });

  afterEach(clearFiles);

  describe('exporting on Android', () => {
    beforeEach(async () => {
      seedDatabase();
      for (const file of SEEDED_FILES) {
        await write(file, `content of ${file}`, Directory.Data);
      }
      // As on a device that exported before: the folders are there.
      await makeFolders();
      await android();
    });

    it('copies every photo and every graph next to the zip, under the path it has in the app', async () => {
      await page.export();

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual(
        [...SEEDED_FILES, 'Beanconqueror.zip'].sort(),
      );
      for (const file of SEEDED_FILES) {
        expect(await read(`${EXPORT_DIR}/${file}`, Directory.External))
          .withContext(file)
          .toBe(`content of ${file}`);
      }
    });

    it('leaves the files of the app where they are', async () => {
      await page.export();

      expect(await filesIn('', Directory.Data)).toEqual(
        SEEDED_FILES.map((_file) => _file),
      );
      expect(database.set).not.toHaveBeenCalled();
    });

    it('writes the zip of the data and offers to share it', async () => {
      await page.export();

      expect(
        atob(
          (
            await Filesystem.readFile({
              path: `${EXPORT_DIR}/Beanconqueror.zip`,
              directory: Directory.External,
            })
          ).data as string,
        ),
      ).toBe(ZIP);
      expect(share).toHaveBeenCalledTimes(1);
      expect(share.calls.argsFor(0)[0]).toEqual({
        url: `/EXTERNAL/${EXPORT_DIR}/Beanconqueror.zip`,
      });
    });

    it('goes on with the other files when one is missing, and tells how many are missing', async () => {
      const texts = watchTexts();
      await Filesystem.deleteFile({
        path: 'photo_brew.jpg',
        directory: Directory.Data,
      });
      await Filesystem.deleteFile({
        path: 'brews/brew-1_flow_profile.json',
        directory: Directory.Data,
      });

      await expectAsync(page.export()).toBeResolved();

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual(
        [...SEEDED_FILES, 'Beanconqueror.zip']
          .filter(
            (_file) =>
              _file !== 'photo_brew.jpg' &&
              _file !== 'brews/brew-1_flow_profile.json',
          )
          .sort(),
      );
      expect(
        log.error.calls
          .allArgs()
          .map((_args) => `${_args[0]} ${_args[1]} ${_args[3]}`),
      ).toEqual([
        'Error while exporting photo_brew.jpg .The error will be ignored.',
        'Error while exporting brews/brew-1_flow_profile.json .The error will be ignored.',
      ]);
      // After the export, which is complete apart from these two files.
      expect(showMessage.calls.allArgs()).toEqual([['FILES_NOT_COPIED']]);
      expect(texts).toHaveBeenCalledWith('FILES_NOT_COPIED', { count: 2 });
      expect(share).toHaveBeenCalledBefore(showMessage);
    });

    it('tells how many files are missing also when sharing the zip is cancelled', async () => {
      const texts = watchTexts();
      await Filesystem.deleteFile({
        path: 'photo_brew.jpg',
        directory: Directory.Data,
      });
      share.and.rejectWith(new Error('Share canceled'));

      await expectAsync(page.export()).toBeRejected();

      expect(showMessage.calls.allArgs()).toEqual([['FILES_NOT_COPIED']]);
      expect(texts).toHaveBeenCalledWith('FILES_NOT_COPIED', { count: 1 });
    });

    it('tells nothing more when every file was copied', async () => {
      await page.export();

      expect(showMessage).not.toHaveBeenCalled();
    });

    it('makes the folders of a first export before it copies a file into them', async () => {
      await clearFiles();
      for (const file of SEEDED_FILES) {
        await write(file, `content of ${file}`, Directory.Data);
      }

      await expectAsync(page.export()).toBeResolved();

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual(
        [...SEEDED_FILES, 'Beanconqueror.zip'].sort(),
      );
      expect(log.error).not.toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('replaces the files of an earlier export', async () => {
      await write(`${EXPORT_DIR}/photo_bean.jpg`, 'old', Directory.External);
      await write(`${EXPORT_DIR}/Beanconqueror.zip`, 'old', Directory.External);
      await write(`${EXPORT_DIR}/unrelated.txt`, 'kept', Directory.External);

      await page.export();

      expect(
        await read(`${EXPORT_DIR}/photo_bean.jpg`, Directory.External),
      ).toBe('content of photo_bean.jpg');
      expect(
        await read(`${EXPORT_DIR}/unrelated.txt`, Directory.External),
      ).toBe('kept');
    });

    it('fails without copying anything when the zip cannot be built', async () => {
      buildExportZIP.and.rejectWith(new Error('no memory'));

      await expectAsync(page.export()).toBeRejectedWithError('no memory');

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual([]);
      expect(share).not.toHaveBeenCalled();
    });

    it('known gap: leaves photos and graphs without the zip behind when the zip cannot be written', async () => {
      const writeFile = original('writeFile');
      spyOn(FilesystemWeb.prototype, 'writeFile').and.callFake(function (
        this: FilesystemWeb,
        _options,
      ) {
        return _options.path.endsWith('.zip')
          ? Promise.reject(new Error('disk full'))
          : writeFile(this, _options);
      });

      await expectAsync(page.export()).toBeRejectedWithError('disk full');

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual(
        SEEDED_FILES,
      );
      expect(share).not.toHaveBeenCalled();
    });

    it('exports only the zip for a database without entries', async () => {
      for (const key of [...database.values.keys()]) {
        database.values.set(key, []);
      }
      for (const storage of Object.values(storages)) {
        await storage.reinitializeStorage();
      }

      await page.export();

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual([
        'Beanconqueror.zip',
      ]);
      expect(log.error).not.toHaveBeenCalled();
    });

    it('exports the photos of 300 beans', async () => {
      const many = Array.from({ length: 300 }, (_, i) =>
        entry(`bean-${i}`, { attachments: [`many/photo_${i}.jpg`] }),
      );
      database.values.set('BEANS', many);
      await storages.beans.reinitializeStorage();
      for (let i = 0; i < 300; i++) {
        await write(`many/photo_${i}.jpg`, `${i}`, Directory.Data);
      }
      await Filesystem.mkdir({
        path: `${EXPORT_DIR}/many`,
        directory: Directory.External,
      });

      await page.export();

      const exported = await filesIn(`${EXPORT_DIR}/many`, Directory.External);
      expect(exported.length).toBe(300);
      expect(
        await read(`${EXPORT_DIR}/many/photo_299.jpg`, Directory.External),
      ).toBe('299');
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe('exporting on iOS', () => {
    it('writes only the zip: the files of the app are in the documents folder already', async () => {
      seedDatabase();
      for (const file of SEEDED_FILES) {
        await write(file, `content of ${file}`, Directory.Documents);
      }
      await ios();

      await page.export();

      expect(await filesIn(EXPORT_DIR, Directory.External)).toEqual([
        'Beanconqueror.zip',
      ]);
      expect(share).toHaveBeenCalledTimes(1);
    });
  });

  describe('the folder export and import of Android', () => {
    it('is refused on other platforms before anything is asked', async () => {
      await ios();

      await expectAsync(
        page.exportToSafDirectoryAndroid(),
      ).toBeRejectedWithError(
        'exportToDirectoryAndroid is only available on Android',
      );
      await expectAsync(
        page.importFromDirectoryAndroid(),
      ).toBeRejectedWithError(
        'importFromDirectoryAndroid is only available on Android',
      );
      expect(showLoadingSpinner).not.toHaveBeenCalled();
      expect(buildExportZIP).not.toHaveBeenCalled();
    });
  });

  describe('importing the files of a backup on Android', () => {
    const IMPORT_DIR = '/CACHE/picked/folder';
    const inBackup = (_file: string) => `picked/folder/${_file}`;

    beforeEach(async () => {
      seedDatabase();
      await android();
      for (const file of SEEDED_FILES) {
        await write(inBackup(file), `imported ${file}`, Directory.Cache);
      }
    });

    it('copies the photos of the entries into the app', async () => {
      await page._importFiles(storages.beans.getAllEntries(), IMPORT_DIR);
      await page._importFiles(storages.mills.getAllEntries(), IMPORT_DIR);

      expect(await filesIn('', Directory.Data)).toEqual([
        'photo_bean.jpg',
        'photo_bean2.png',
        'photo_mill.jpg',
      ]);
      expect(await read('photo_bean2.png', Directory.Data)).toBe(
        'imported photo_bean2.png',
      );
      // The files of the backup stay where they are.
      expect(await read(inBackup('photo_bean.jpg'), Directory.Cache)).toBe(
        'imported photo_bean.jpg',
      );
    });

    it('copies the graph of a brew and the graph it imported as a reference', async () => {
      await page._importFlowProfileFiles(
        storages.brews.getAllEntries(),
        IMPORT_DIR,
      );

      expect(await filesIn('', Directory.Data)).toEqual([
        'brews/brew-1_flow_profile.json',
        'importedGraph/brew-2_flow_profile.json',
      ]);
      expect(await read('brews/brew-1_flow_profile.json', Directory.Data)).toBe(
        'imported brews/brew-1_flow_profile.json',
      );
    });

    it('copies the graphs of the graph section and of the barista mode', async () => {
      await page._importGraphProfileFiles(
        storages.graphs.getAllEntries(),
        IMPORT_DIR,
      );
      await page._importBaristamodeFlowProfileFiles(
        storages.baristaBrews.getAllEntries(),
        IMPORT_DIR,
      );

      expect(await filesIn('', Directory.Data)).toEqual([
        'baristamode/barista-1_flow_profile.json',
        'graphs/graph-1_flow_profile.json',
      ]);
    });

    it('known gap: looks for a graph where its entry says, while the export wrote it under its uuid', async () => {
      const graphs = storages.graphs.getAllEntries();
      graphs[0].flow_profile = 'graphs/another-name.json';
      await write(
        inBackup('graphs/another-name.json'),
        'by name',
        Directory.Cache,
      );

      await page._importGraphProfileFiles(graphs, IMPORT_DIR);

      expect(await filesIn('', Directory.Data)).toEqual([
        'graphs/another-name.json',
      ]);
    });

    it('replaces a file the app already has', async () => {
      await write('photo_bean.jpg', 'from before the import', Directory.Data);

      await page._importFiles(storages.beans.getAllEntries(), IMPORT_DIR);

      expect(await read('photo_bean.jpg', Directory.Data)).toBe(
        'imported photo_bean.jpg',
      );
    });

    it('skips a file the backup does not have, logs it and goes on', async () => {
      await Filesystem.deleteFile({
        path: inBackup('photo_bean.jpg'),
        directory: Directory.Cache,
      });

      await expectAsync(
        page._importFiles(storages.beans.getAllEntries(), IMPORT_DIR),
      ).toBeResolved();

      expect(await filesIn('', Directory.Data)).toEqual(['photo_bean2.png']);
      expect(log.error.calls.allArgs()).toEqual([
        [
          'File to import with internal path',
          'photo_bean.jpg',
          'does not exist at',
          `${IMPORT_DIR}/photo_bean.jpg`,
          '; Skipping import.',
        ],
      ]);
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('goes on with the next file when one cannot be copied', async () => {
      const copy = original('copy');
      spyOn(FilesystemWeb.prototype, 'copy').and.callFake(function (
        this: FilesystemWeb,
        _options,
      ) {
        return _options.to === 'photo_bean.jpg'
          ? Promise.reject(new Error('disk full'))
          : copy(this, _options);
      });

      await expectAsync(
        page._importFiles(storages.beans.getAllEntries(), IMPORT_DIR),
      ).toBeResolved();

      expect(await filesIn('', Directory.Data)).toEqual(['photo_bean2.png']);
      expect(log.error.calls.argsFor(0).slice(0, 5)).toEqual([
        'Import file error for file',
        'photo_bean.jpg',
        'in path',
        IMPORT_DIR,
        '; Error:',
      ]);
    });

    it('finds the photo of an entry that names it with a leading slash', async () => {
      const beans = storages.beans.getAllEntries();
      beans[0].attachments = ['/photo_bean.jpg'];

      await page._importFiles(beans, IMPORT_DIR);

      expect(await filesIn('', Directory.Data)).toEqual(['photo_bean.jpg']);
    });

    it('copies nothing for entries without photos or graphs', async () => {
      await page._importFiles([], IMPORT_DIR);
      await page._importFiles(
        [entry('a'), entry('b', { attachments: [] })],
        IMPORT_DIR,
      );
      await page._importFlowProfileFiles(
        [storages.brews.getAllEntries()[2]],
        IMPORT_DIR,
      );
      await page._importGraphProfileFiles(
        [storages.graphs.getAllEntries()[1]],
        IMPORT_DIR,
      );
      await page._importBaristamodeFlowProfileFiles(
        [storages.baristaBrews.getAllEntries()[1]],
        IMPORT_DIR,
      );

      expect(await filesIn('', Directory.Data)).toEqual([]);
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe('importing the parsed data of a backup', () => {
    const IMPORT_DIR = '/CACHE/picked/folder';
    let importBackup: jasmine.Spy;
    let saveSettings: jasmine.Spy;
    let settings: Settings;

    /** The page after the question was answered with yes. */
    async function open(_platforms: string[]): Promise<void> {
      seedDatabase();
      await createPage(_platforms);
      for (const file of SEEDED_FILES) {
        await write(
          `picked/folder/${file}`,
          `imported ${file}`,
          Directory.Cache,
        );
      }
      settings = new Settings();
      settings.matomo_analytics = false;
      importBackup = jasmine
        .createSpy('importBackup')
        .and.resolveTo({ BACKUP: false });
      saveSettings = jasmine.createSpy('saveSettings').and.resolveTo();
      Object.assign(page, {
        settings: new Settings(),
        uiAlert: {
          showMessage,
          showMessageWithDetails,
          showLoadingSpinner,
          hideLoadingSpinner,
          showConfirm: () => Promise.resolve('YES'),
        },
        uiHelper: { copyData: <T>(_value: T): T => structuredClone(_value) },
        uiExportImportHelper: {
          savesBackupBeforeImport: () => true,
          importBackup,
        },
        uiSettingsStorage: {
          getDBPath: () => 'SETTINGS',
          getSettings: () => settings,
          saveSettings,
        },
        uiVersionStorage: { getDBPath: () => 'VERSION' },
        uiAnalytics: {
          disableTracking: () => undefined,
          enableTracking: () => undefined,
        },
        themeService: { adjustTheme: () => Promise.resolve() },
        // Reading the collections again has tests of its own.
        __reinitializeStorages: () => Promise.resolve(),
        setLanguage: () => undefined,
      });
    }

    function parsed(_settings: object = {}) {
      return {
        SETTINGS: [{ brew_view: 0, brew_order: { before: {} }, ..._settings }],
        BREWS: [{}],
      };
    }

    function importedSettings(): Record<string, unknown> {
      const [content] = importBackup.calls.argsFor(0) as [
        { SETTINGS: Record<string, unknown>[] },
      ];
      return content.SETTINGS[0];
    }

    it('copies the photos and graphs of every collection into the app on Android', async () => {
      await open(['capacitor', 'android']);

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await filesIn('', Directory.Data)).toEqual(SEEDED_FILES);
      expect(await read('photo_water.jpg', Directory.Data)).toBe(
        'imported photo_water.jpg',
      );
      expect(showMessage.calls.allArgs()).toEqual([['IMPORT_SUCCESSFULLY']]);
      expect(log.error).not.toHaveBeenCalled();
    });

    it('calls the import a success also when files of the backup are missing, and tells how many', async () => {
      await open(['capacitor', 'android']);
      const texts = watchTexts();
      await Filesystem.rmdir({
        path: 'picked/folder',
        directory: Directory.Cache,
        recursive: true,
      });

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await filesIn('', Directory.Data)).toEqual([]);
      expect(log.error).toHaveBeenCalledTimes(SEEDED_FILES.length);
      expect(showMessage.calls.allArgs()).toEqual([
        ['IMPORT_SUCCESSFULLY'],
        ['FILES_NOT_COPIED'],
      ]);
      expect(texts).toHaveBeenCalledWith('FILES_NOT_COPIED', {
        count: SEEDED_FILES.length,
      });
    });

    it('does not count a file the backup lacks while the app still has it, but counts one missing in both', async () => {
      await open(['capacitor', 'android']);
      const texts = watchTexts();
      // An automatic backup is only the ZIP: no photos or graphs next to it.
      await Filesystem.rmdir({
        path: 'picked/folder',
        directory: Directory.Cache,
        recursive: true,
      });
      for (const file of SEEDED_FILES) {
        if (file !== 'photo_water.jpg') {
          await write(file, `kept ${file}`, Directory.Data);
        }
      }

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await read('photo_bean.jpg', Directory.Data)).toBe(
        'kept photo_bean.jpg',
      );
      expect(log.error.calls.allArgs()).toEqual([
        [
          'File to import with internal path',
          'photo_water.jpg',
          'does not exist at',
          `${IMPORT_DIR}/photo_water.jpg`,
          '; Skipping import.',
        ],
      ]);
      expect(showMessage.calls.allArgs()).toEqual([
        ['IMPORT_SUCCESSFULLY'],
        ['FILES_NOT_COPIED'],
      ]);
      expect(texts).toHaveBeenCalledWith('FILES_NOT_COPIED', { count: 1 });
    });

    it('says nothing about files when the backup lacks them all but the app has them', async () => {
      await open(['capacitor', 'android']);
      await Filesystem.rmdir({
        path: 'picked/folder',
        directory: Directory.Cache,
        recursive: true,
      });
      for (const file of SEEDED_FILES) {
        await write(file, `kept ${file}`, Directory.Data);
      }

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await filesIn('', Directory.Data)).toEqual(SEEDED_FILES);
      expect(log.error).not.toHaveBeenCalled();
      expect(showMessage.calls.allArgs()).toEqual([['IMPORT_SUCCESSFULLY']]);
    });

    it('counts a file of the backup that cannot be copied', async () => {
      await open(['capacitor', 'android']);
      const texts = watchTexts();
      const copy = original('copy');
      spyOn(FilesystemWeb.prototype, 'copy').and.callFake(function (
        this: FilesystemWeb,
        _options,
      ) {
        return _options.to === 'photo_water.jpg'
          ? Promise.reject(new Error('disk full'))
          : copy(this, _options);
      });

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await filesIn('', Directory.Data)).toEqual(
        SEEDED_FILES.filter((_file) => _file !== 'photo_water.jpg'),
      );
      expect(showMessage.calls.allArgs()).toEqual([
        ['IMPORT_SUCCESSFULLY'],
        ['FILES_NOT_COPIED'],
      ]);
      expect(texts).toHaveBeenCalledWith('FILES_NOT_COPIED', { count: 1 });
    });

    for (const platforms of [['capacitor', 'ios'], ['desktop']]) {
      it(`copies no files on ${platforms.join(' ')}`, async () => {
        await open(platforms);

        await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

        expect(await filesIn('', Directory.Data)).toEqual([]);
        expect(await filesIn('', Directory.Documents)).toEqual([]);
        // It does not even try.
        expect(log.error).not.toHaveBeenCalled();
        expect(showMessage.calls.allArgs()).toEqual([['IMPORT_SUCCESSFULLY']]);
      });
    }

    it('copies no files when the data was put back as it was', async () => {
      await open(['capacitor', 'android']);
      const cause = new Error('quota exceeded');
      importBackup.and.resolveTo({ BACKUP: true, cause });

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(await filesIn('', Directory.Data)).toEqual([]);
      expect(saveSettings).not.toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithDetails.calls.allArgs()).toEqual([
        ['IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED', cause],
      ]);
    });

    it('hands the settings on with the view as text', async () => {
      await open(['capacitor', 'ios']);

      await page.__importJSON(
        parsed({ brew_view: 1 }),
        IMPORT_DIR,
        'Beanconqueror.zip',
      );

      expect(importedSettings().brew_view).toBe('1');
    });

    it('replaces the imported filters with the empty filters of this version', async () => {
      await open(['capacitor', 'ios']);
      const content = parsed({ brew_filter: { OPEN: { mill: ['gone'] } } });

      await page.__importJSON(content, IMPORT_DIR, 'Beanconqueror.zip');

      expect(importedSettings().brew_filter).toEqual({
        ARCHIVED: new Settings().GET_BREW_FILTER(),
        OPEN: new Settings().GET_BREW_FILTER(),
      });
      expect(importedSettings().bean_filter).toEqual({
        OPEN: new Settings().GET_BEAN_FILTER(),
        ARCHIVED: new Settings().GET_BEAN_FILTER(),
      });
      expect(
        (content.SETTINGS as unknown as { brew_filter?: object }).brew_filter,
      ).toBeUndefined();
    });

    it('gives settings without an order of the brew fields the one of this version', async () => {
      await open(['capacitor', 'ios']);

      await page.__importJSON(
        parsed({ brew_order: undefined }),
        IMPORT_DIR,
        'Beanconqueror.zip',
      );

      expect(importedSettings().brew_order).toEqual(
        structuredClone(new Settings().brew_order),
      );
    });

    it('gives settings with an order of the brew fields in the old structure the one of this version', async () => {
      await open(['capacitor', 'ios']);

      await page.__importJSON(
        parsed({ brew_order: { grind_size: 1, grind_weight: 2 } }),
        IMPORT_DIR,
        'Beanconqueror.zip',
      );

      expect(importedSettings().brew_order).toEqual(
        structuredClone(new Settings().brew_order),
      );
    });

    it('keeps an order of the brew fields in the current structure', async () => {
      await open(['capacitor', 'ios']);
      const order = { before: { grind_size: 2 }, while: {}, after: {} };

      await page.__importJSON(
        parsed({ brew_order: order }),
        IMPORT_DIR,
        'Beanconqueror.zip',
      );

      expect(importedSettings().brew_order).toEqual(order);
    });

    it('sets rating steps of 1 for settings that have none, resets the filters and saves', async () => {
      await open(['capacitor', 'ios']);
      settings.brew_rating_steps = null;
      settings.bean_rating_steps = undefined;
      settings.bean_filter.OPEN.favourite = true;

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(settings.brew_rating_steps).toBe(1);
      expect(settings.bean_rating_steps).toBe(1);
      expect(settings.bean_filter.OPEN.favourite).toBeFalse();
      expect(saveSettings.calls.allArgs()).toEqual([[settings]]);
    });

    it('keeps the rating steps the settings have', async () => {
      await open(['capacitor', 'ios']);
      settings.brew_rating_steps = 0.5;
      settings.bean_rating_steps = 0.1;

      await page.__importJSON(parsed(), IMPORT_DIR, 'Beanconqueror.zip');

      expect(settings.brew_rating_steps).toBe(0.5);
      expect(settings.bean_rating_steps).toBe(0.1);
    });

    for (const [name, content, problem] of [
      ['an empty file', {}, 'The file holds no list SETTINGS, BEANS, BREWS'],
      [
        'the file of another app',
        { recipes: [{ name: 'V60' }], version: 3 },
        'The file holds no list SETTINGS, BEANS, BREWS',
      ],
      ['a list', [{ SETTINGS: [{}] }], 'The file holds no JSON object'],
    ] as [string, unknown, string][]) {
      it(`refuses ${name} as no backup before anything is asked or imported`, async () => {
        await open(['capacitor', 'android']);
        const { uiAlert } = page as unknown as {
          uiAlert: { showConfirm: () => Promise<string> };
        };
        const confirm = spyOn(uiAlert, 'showConfirm').and.resolveTo('YES');

        await page.__importJSON(content, IMPORT_DIR, 'Beanconqueror.zip');

        expect(confirm).not.toHaveBeenCalled();
        expect(importBackup).not.toHaveBeenCalled();
        expect(showMessage).not.toHaveBeenCalled();
        expect(hideLoadingSpinner).toHaveBeenCalled();
        expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
          'IMPORT_NOT_A_BACKUP',
          problem,
        );
        expect(await filesIn('', Directory.Data)).toEqual([]);
        expect(database.set).not.toHaveBeenCalled();
      });
    }

    // Taken for a backup, but without the settings it cannot be imported.
    for (const [name, content] of [
      ['a file without settings', { BREWS: [{}], BEANS: [{}] }],
      ['a file with an empty list of settings', { SETTINGS: [] }],
    ] as [string, object][]) {
      it(`refuses ${name} before anything is asked or imported`, async () => {
        await open(['capacitor', 'android']);

        await page.__importJSON(content, IMPORT_DIR, 'Beanconqueror.zip');

        expect(importBackup).not.toHaveBeenCalled();
        expect(showMessage).not.toHaveBeenCalled();
        // The settings of the file are missing: the reason is shown apart.
        expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
          'INVALID_FILE_DATA',
          jasmine.any(TypeError),
        );
        expect(await filesIn('', Directory.Data)).toEqual([]);
      });
    }
  });

  describe('reading the chosen file', () => {
    it('reports a file that cannot be read with the reason', async () => {
      await android();

      await page.doImport(
        'zip',
        '/CACHE/picked/gone.zip',
        '/CACHE/picked',
        'gone.zip',
      );

      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
        'ERROR_ON_FILE_READING',
        jasmine.any(Error),
      );
    });

    it('imports a JSON file of an older export as a backup', async () => {
      await android();
      await write('picked/Beanconqueror.json', '{"BREWS":[]}', Directory.Cache);
      const importJSON = spyOn(page, '__importJSON').and.resolveTo();

      await page.doImport(
        'json',
        '/CACHE/picked/Beanconqueror.json',
        '/CACHE/picked',
        'Beanconqueror.json',
      );

      expect(importJSON.calls.allArgs()).toEqual([
        [{ BREWS: [] }, '/CACHE/picked', 'Beanconqueror.json'],
      ]);
    });

    it('refuses a JSON file of another app with the reason, without writing', async () => {
      await android();
      await write(
        'picked/brews.json',
        '{"shots":[{"dose":18}]}',
        Directory.Cache,
      );

      await page.doImport(
        'json',
        '/CACHE/picked/brews.json',
        '/CACHE/picked',
        'brews.json',
      );

      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
        'IMPORT_NOT_A_BACKUP',
        'The file holds no list SETTINGS, BEANS, BREWS',
      );
      expect(log.error).toHaveBeenCalledOnceWith(
        'Import - refused: The file holds no list SETTINGS, BEANS, BREWS',
      );
      expect(database.set).not.toHaveBeenCalled();
    });

    it('refuses a zip without settings, beans and brews with the reason, without writing', async () => {
      await android();
      await write('picked/other.zip', 'zip of another app', Directory.Cache);
      Object.assign(page, {
        uiExportImportHelper: {
          getJSONFromZIPArrayBufferContent: () =>
            Promise.resolve({ PHOTOS: [] }),
        },
      });

      await page.doImport(
        'zip',
        '/CACHE/picked/other.zip',
        '/CACHE/picked',
        'other.zip',
      );

      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
        'IMPORT_NOT_A_BACKUP',
        'The file holds no list SETTINGS, BEANS, BREWS',
      );
      expect(database.set).not.toHaveBeenCalled();
    });

    /** Writes a real zip with these files to the picked folder. */
    async function writeZip(
      _name: string,
      _files: Record<string, string>,
    ): Promise<void> {
      const writer = new ZipWriter(new Uint8ArrayWriter());
      for (const [name, text] of Object.entries(_files)) {
        await writer.add(name, new TextReader(text));
      }
      const bytes = await writer.close();
      await Filesystem.writeFile({
        path: `picked/${_name}`,
        directory: Directory.Cache,
        data: btoa(String.fromCharCode(...bytes)),
        recursive: true,
      });
    }

    /** The page reads zips with the helper of the app, not a stand-in. */
    function readZipsForReal(): void {
      Object.assign(page, {
        uiExportImportHelper: Object.assign(
          Object.create(UIExportImportHelper.prototype) as object,
          { uiLog: log },
        ),
      });
    }

    for (const [name, files, problem] of [
      [
        'a zip of another app',
        { 'recipes.json': '{"recipes":[]}' },
        'The zip file holds no Beanconqueror.json',
      ],
      ['an empty zip', {}, 'The zip file is empty'],
    ] as [string, Record<string, string>, string][]) {
      it(`refuses ${name} as no backup, without writing`, async () => {
        await android();
        readZipsForReal();
        await writeZip('other.zip', files);

        await page.doImport(
          'zip',
          '/CACHE/picked/other.zip',
          '/CACHE/picked',
          'other.zip',
        );

        expect(showMessage).not.toHaveBeenCalled();
        expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
          'IMPORT_NOT_A_BACKUP',
          problem,
        );
        expect(log.error).toHaveBeenCalledOnceWith(
          `Import - refused: ${problem}`,
        );
        expect(hideLoadingSpinner).toHaveBeenCalled();
        expect(database.set).not.toHaveBeenCalled();
      });
    }

    it('still imports a zip of an export after reading it for real', async () => {
      await android();
      readZipsForReal();
      await writeZip('Beanconqueror.zip', {
        'Beanconqueror.json': '{"BREWS":[{"a":1}]}',
        'Beanconqueror_Brews_1.json': '[{"a":2}]',
      });
      const importJSON = spyOn(page, '__importJSON').and.resolveTo();

      await page.doImport(
        'zip',
        '/CACHE/picked/Beanconqueror.zip',
        '/CACHE/picked',
        'Beanconqueror.zip',
      );

      expect(importJSON.calls.allArgs()).toEqual([
        [{ BREWS: [{ a: 1 }, { a: 2 }] }, '/CACHE/picked', 'Beanconqueror.zip'],
      ]);
    });

    for (const [list, size] of [
      ['BREWS', 500],
      ['BEANS', 500],
      ['BARISTAMODE_BREWS', 250],
    ] as [string, number][]) {
      it(`refuses a JSON file with ${size} ${list}, the first part of a split export`, async () => {
        await android();
        const content = {
          SETTINGS: [{}],
          [list]: Array.from({ length: size }, (_, i) => ({ i })),
        };
        await write(
          'picked/Beanconqueror.json',
          JSON.stringify(content),
          Directory.Cache,
        );
        const importJSON = spyOn(page, '__importJSON').and.resolveTo();

        await page.doImport(
          'json',
          '/CACHE/picked/Beanconqueror.json',
          '/CACHE/picked',
          'Beanconqueror.json',
        );

        expect(importJSON).not.toHaveBeenCalled();
        expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
          'IMPORT_ONLY_PART_OF_BACKUP',
          `The list ${list} holds ${size} entries, the size of the first part of an export split into several files`,
        );
        expect(hideLoadingSpinner).toHaveBeenCalled();
        expect(database.set).not.toHaveBeenCalled();
      });
    }

    it('imports a JSON file with more brews than one part of a split export', async () => {
      await android();
      const content = { BREWS: Array.from({ length: 501 }, (_, i) => ({ i })) };
      await write(
        'picked/Beanconqueror.json',
        JSON.stringify(content),
        Directory.Cache,
      );
      const importJSON = spyOn(page, '__importJSON').and.resolveTo();

      await page.doImport(
        'json',
        '/CACHE/picked/Beanconqueror.json',
        '/CACHE/picked',
        'Beanconqueror.json',
      );

      expect(importJSON).toHaveBeenCalledOnceWith(
        content,
        '/CACHE/picked',
        'Beanconqueror.json',
      );
      expect(showMessageWithDetails).not.toHaveBeenCalled();
    });

    it('reports a JSON file that is damaged', async () => {
      await android();
      await write('picked/Beanconqueror.json', '{"BREWS":', Directory.Cache);

      await page.doImport(
        'json',
        '/CACHE/picked/Beanconqueror.json',
        '/CACHE/picked',
        'Beanconqueror.json',
      );

      expect(showMessageWithDetails).toHaveBeenCalledOnceWith(
        'ERROR_ON_FILE_READING',
        jasmine.any(SyntaxError),
      );
    });
  });

  describe('choosing a file on a device', () => {
    let doImport: jasmine.Spy;
    let picked: { path?: string; mimeType: string; name: string }[];

    async function open(_platforms: string[]): Promise<void> {
      await createPage(_platforms);
      doImport = spyOn(page, 'doImport').and.resolveTo();
      spyOn(FilePickerWeb.prototype, 'pickFiles').and.callFake(() =>
        Promise.resolve({ files: picked } as Awaited<
          ReturnType<FilePickerWeb['pickFiles']>
        >),
      );
    }

    it('imports a zip on iOS together with the files of its folder', async () => {
      picked = [
        {
          path: 'file:///docs/My Export/Beanconqueror 2.zip',
          mimeType: 'application/zip',
          name: 'Beanconqueror 2.zip',
        },
      ];
      await open(['capacitor', 'ios']);

      await page.import();

      expect(doImport.calls.allArgs()).toEqual([
        [
          'zip',
          'file:///docs/My Export/Beanconqueror 2.zip',
          'file:///docs/My Export',
          'Beanconqueror 2.zip',
        ],
      ]);
    });

    it('imports a zip on Android with the files of the export folder, wherever the zip was', async () => {
      picked = [
        {
          path: 'content://downloads/Beanconqueror.zip',
          mimeType: 'application/x-zip-compressed',
          name: 'Beanconqueror.zip',
        },
      ];
      await open(['capacitor', 'android']);

      await page.import();

      expect(doImport.calls.allArgs()).toEqual([
        [
          'zip',
          'content://downloads/Beanconqueror.zip',
          '/EXTERNAL/Download/Beanconqueror_export',
          'Beanconqueror.zip',
        ],
      ]);
    });

    it('hands a JSON file on as such', async () => {
      picked = [
        {
          path: 'file:///docs/Beanconqueror.json',
          mimeType: 'application/json',
          name: 'Beanconqueror.json',
        },
      ];
      await open(['capacitor', 'ios']);

      await page.import();

      expect(doImport.calls.argsFor(0)[0]).toBe('json');
    });

    for (const mimeType of ['image/jpeg', 'application/pdf', '']) {
      it(`refuses a file of the type "${mimeType}"`, async () => {
        picked = [{ path: 'file:///docs/a', mimeType, name: 'a' }];
        await open(['capacitor', 'ios']);

        await page.import();

        expect(doImport).not.toHaveBeenCalled();
        expect(showMessage.calls.allArgs()).toEqual([['INVALID_FILE_FORMAT']]);
      });
    }

    it('does nothing when no file was chosen', async () => {
      await open(['capacitor', 'ios']);
      for (const nothing of [
        [],
        undefined,
        [{ mimeType: 'application/zip', name: 'a.zip' }],
      ]) {
        picked = nothing;

        await page.import();
      }

      expect(doImport).not.toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
    });
  });

  describe('choosing a file in the browser', () => {
    let importJSON: jasmine.Spy;
    let parse: jasmine.Spy;
    /** Resolves when the page has dealt with the chosen file. */
    let done: Promise<void>;

    /** Opens the import and chooses the file, as the file dialog would. */
    async function choose(_file: File | undefined): Promise<void> {
      await createPage(['desktop']);
      let finished: () => void;
      done = new Promise((_resolve) => (finished = _resolve));
      parse = jasmine
        .createSpy('getJSONFromZIPArrayBufferContent')
        .and.resolveTo({ BREWS: [] });
      importJSON = spyOn(page, '__importJSON').and.callFake(() => {
        finished();
        return Promise.resolve();
      });
      for (const message of [showMessage, showMessageWithDetails]) {
        message.and.callFake(() => {
          finished();
          return Promise.resolve();
        });
      }
      Object.assign(page, {
        uiExportImportHelper: { getJSONFromZIPArrayBufferContent: parse },
      });
      spyOn(HTMLInputElement.prototype, 'click').and.callFake(function (
        this: HTMLInputElement,
      ) {
        const chosen = new DataTransfer();
        if (_file) {
          chosen.items.add(_file);
        }
        this.files = chosen.files;
        this.dispatchEvent(new Event('change'));
      });

      await page.import();
    }

    it('reads a zip and imports its data under the name of the file, without a folder of files', async () => {
      await choose(new File([new Uint8Array([80, 75, 3, 4])], 'My Backup.ZIP'));
      await done;

      expect(
        Array.from(new Uint8Array(parse.calls.argsFor(0)[0] as ArrayBuffer)),
      ).toEqual([80, 75, 3, 4]);
      expect(importJSON.calls.allArgs()).toEqual([
        [{ BREWS: [] }, '', 'My Backup.ZIP'],
      ]);
      expect(showLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).not.toHaveBeenCalled();
    });

    for (const name of ['Beanconqueror.json', 'backup.zip.txt', 'zip.']) {
      it(`refuses the file ${name}`, async () => {
        await choose(new File(['{}'], name));
        await done;

        expect(showMessage.calls.allArgs()).toEqual([['INVALID_FILE_FORMAT']]);
        expect(parse).not.toHaveBeenCalled();
        expect(importJSON).not.toHaveBeenCalled();
      });
    }

    it('takes a file without an ending that is called zip for a zip', async () => {
      await choose(new File(['{}'], 'zip'));
      await done;

      expect(importJSON).toHaveBeenCalledTimes(1);
    });

    it('reports a zip that cannot be read, with the reason, and hides the spinner', async () => {
      await choose(new File(['no zip'], 'Beanconqueror.zip'));
      parse.and.rejectWith(new Error('not a zip'));
      await done;

      expect(showMessage).not.toHaveBeenCalled();
      expect(showMessageWithDetails.calls.allArgs()).toEqual([
        ['ERROR_ON_FILE_READING', new Error('not a zip')],
      ]);
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(importJSON).not.toHaveBeenCalled();
    });

    it('refuses a zip that is no backup, with the reason, and hides the spinner', async () => {
      await choose(new File(['zip'], 'Other.zip'));
      parse.and.rejectWith(
        new NotABackupError('The zip file holds no Beanconqueror.json'),
      );
      await done;

      expect(showMessageWithDetails.calls.allArgs()).toEqual([
        ['IMPORT_NOT_A_BACKUP', 'The zip file holds no Beanconqueror.json'],
      ]);
      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(importJSON).not.toHaveBeenCalled();
    });

    it('does nothing when the dialog is closed without a file', async () => {
      await choose(undefined);
      // Longer than reading a file takes.
      await new Promise((_resolve) => setTimeout(_resolve, 100));

      expect(parse).not.toHaveBeenCalled();
      expect(importJSON).not.toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
    });
  });

  describe('the settings of an import', () => {
    it('get the filters of this version instead of the imported ones', async () => {
      await android();
      const filter = {
        GET_BREW_FILTER: () => ({}),
        GET_BEAN_FILTER: () => ({}),
      };
      const brewFilter = { mill: [] as string[] };
      const beanFilter = { favourite: false };
      filter.GET_BREW_FILTER = () => ({ ...brewFilter });
      filter.GET_BEAN_FILTER = () => ({ ...beanFilter });
      page.settings = filter;
      const imported = {
        language: 'de',
        brew_filter: { OPEN: { mill: ['gone'] }, OLD_KEY: {} },
        bean_filter: { OPEN: { favourite: true }, FROZEN: {} },
      };

      page.__cleanupImportSettingsData(imported);

      expect(imported).toEqual({
        language: 'de',
        brew_filter: { ARCHIVED: brewFilter, OPEN: brewFilter },
        bean_filter: { OPEN: beanFilter, ARCHIVED: beanFilter },
      } as unknown as typeof imported);
      // Each view gets a filter of its own.
      const filters = imported.brew_filter as Record<string, object>;
      expect(filters.OPEN).not.toBe(filters.ARCHIVED);
    });

    it('are left alone when there are none', async () => {
      await android();

      expect(() => page.__cleanupImportSettingsData(undefined)).not.toThrow();
    });
  });

  describe('exporting the brews by weight', () => {
    const prep = (_uuid: string, _type: string) =>
      entry(_uuid, { connectedPreparationDevice: { type: _type } });
    const brew = (_uuid: string, _prep: string, _params: object | undefined) =>
      entry(_uuid, {
        method_of_preparation: _prep,
        flow_profile: `brews/${_uuid}_flow_profile.json`,
        preparationDeviceBrew: { type: 'NONE', params: _params },
      });

    async function open(_brews: unknown[]): Promise<void> {
      database.values.set('PREPARATION', [
        prep('xenia', 'XENIA'),
        prep('sanremo', 'SANREMO_YOU'),
        prep('plain', 'NONE'),
      ]);
      database.values.set('BREWS', _brews);
      await android();
    }

    function exported(): string[] {
      const rows = exportBrewByWeightsSmall.calls.argsFor(0)[0] as {
        BREW: { config: { uuid: string } };
      }[];
      return rows.map((_row) => _row.BREW.config.uuid);
    }

    it('knows whether a machine of the kind exists', async () => {
      await open([]);

      expect(page.doWeHaveBrewByWeights('xenia')).toBeTrue();
      expect(page.doWeHaveBrewByWeights('sanremo')).toBeTrue();
      expect(page.doWeHaveBrewByWeights('other')).toBeUndefined();

      database.values.set('PREPARATION', [prep('plain', 'NONE')]);
      await storages.preparations.reinitializeStorage();
      expect(page.doWeHaveBrewByWeights('xenia')).toBeUndefined();
      expect(page.doWeHaveBrewByWeights('sanremo')).toBeUndefined();
    });

    it('tells the two kinds of machines apart', async () => {
      await open([]);
      database.values.set('PREPARATION', [prep('xenia', 'XENIA')]);
      await storages.preparations.reinitializeStorage();
      expect(page.doWeHaveBrewByWeights('xenia')).toBeTrue();
      expect(page.doWeHaveBrewByWeights('sanremo')).toBeUndefined();

      database.values.set('PREPARATION', [prep('sanremo', 'SANREMO_YOU')]);
      await storages.preparations.reinitializeStorage();
      expect(page.doWeHaveBrewByWeights('xenia')).toBeUndefined();
      expect(page.doWeHaveBrewByWeights('sanremo')).toBeTrue();
    });

    it('reads the graph under the uuid of the brew, whatever path the brew names', async () => {
      await open([
        {
          ...brew('s1', 'sanremo', { stopAtWeight: 36 }),
          flow_profile: 'brews/another-name.json',
        },
      ]);
      await write(
        'brews/s1_flow_profile.json',
        JSON.stringify({ weight: ['by uuid'] }),
        Directory.Data,
      );
      await write(
        'brews/another-name.json',
        JSON.stringify({ weight: ['by name'] }),
        Directory.Data,
      );

      await page.exportBrewByWeight('sanremo');

      expect(exportBrewByWeightsSmall.calls.argsFor(0)[0][0].FLOW).toEqual({
        weight: ['by uuid'],
      });
    });

    it('takes the Xenia brews that stopped by weight and have a graph', async () => {
      await open([
        brew('x1', 'xenia', { brew_by_weight_active: true }),
        brew('x2', 'xenia', { brew_by_weight_active: false }),
        brew('x3', 'xenia', undefined),
        brew('x4', 'plain', { brew_by_weight_active: true }),
        brew('x5', 'sanremo', { brew_by_weight_active: true }),
        {
          ...brew('x6', 'xenia', { brew_by_weight_active: true }),
          flow_profile: '',
        },
        brew('x7', 'xenia', { brew_by_weight_active: true }),
      ]);
      for (const uuid of ['x1', 'x2', 'x3', 'x4', 'x5', 'x6']) {
        await write(
          `brews/${uuid}_flow_profile.json`,
          JSON.stringify({ weight: [uuid] }),
          Directory.Data,
        );
      }

      await page.exportBrewByWeight('xenia');

      // x7 has no file for its graph.
      expect(exported()).toEqual(['x1']);
      expect(exportBrewByWeightsSmall.calls.argsFor(0)[0][0].FLOW).toEqual({
        weight: ['x1'],
      });
      expect(showLoadingSpinner).toHaveBeenCalledTimes(1);
    });

    it('takes the Sanremo brews with a weight to stop at', async () => {
      await open([
        brew('s1', 'sanremo', { stopAtWeight: 36 }),
        brew('s2', 'sanremo', { stopAtWeight: 0 }),
        brew('s3', 'sanremo', undefined),
        brew('s4', 'xenia', { stopAtWeight: 36 }),
        brew('s5', 'sanremo', { stopAtWeight: 0.1 }),
      ]);
      for (const uuid of ['s1', 's2', 's3', 's4', 's5']) {
        await write(`brews/${uuid}_flow_profile.json`, '{}', Directory.Data);
      }

      await page.exportBrewByWeight('sanremo');

      expect(exported()).toEqual(['s1', 's5']);
    });

    it('takes the 200 newest of more brews, newest first', async () => {
      const brews = Array.from({ length: 201 }, (_, i) =>
        brew(`b${i}`, 'sanremo', { stopAtWeight: 36 }),
      );
      await open(brews);
      for (let i = 0; i < 201; i++) {
        await write(`brews/b${i}_flow_profile.json`, '{}', Directory.Data);
      }

      await page.exportBrewByWeight('sanremo');

      expect(exported().length).toBe(200);
      expect(exported()[0]).toBe('b200');
      expect(exported()[199]).toBe('b1');
    });

    it('keeps the order of 200 brews', async () => {
      const brews = Array.from({ length: 200 }, (_, i) =>
        brew(`b${i}`, 'sanremo', { stopAtWeight: 36 }),
      );
      await open(brews);
      for (let i = 0; i < 200; i++) {
        await write(`brews/b${i}_flow_profile.json`, '{}', Directory.Data);
      }

      await page.exportBrewByWeight('sanremo');

      expect(exported().length).toBe(200);
      expect(exported()[0]).toBe('b0');
    });

    it('exports an empty list for an unknown kind or without brews', async () => {
      await open([brew('x1', 'xenia', { brew_by_weight_active: true })]);

      await page.exportBrewByWeight('other');

      expect(exportBrewByWeightsSmall.calls.allArgs()).toEqual([[[]]]);
    });

    it('known gap: hides the spinner and tells nothing when the export fails', async () => {
      await open([]);
      exportBrewByWeightsSmall.and.throwError('no memory');

      await expectAsync(page.exportBrewByWeight('xenia')).toBeResolved();

      expect(hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(showMessage).not.toHaveBeenCalled();
    });
  });

  describe('the pin of a slider', () => {
    it('shows at most two digits and 0 for what is no number', async () => {
      await android();

      expect(page.pinFormatter(0.1 + 0.2)).toBe('0.3');
      expect(page.pinFormatter('1.256')).toBe('1.26');
      expect(page.pinFormatter(4)).toBe('4');
      expect(page.pinFormatter('abc')).toBe('0');
      expect(page.pinFormatter(undefined)).toBe('0');
    });
  });
});
