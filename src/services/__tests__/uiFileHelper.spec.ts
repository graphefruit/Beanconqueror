import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Platform } from '@ionic/angular';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';
import { ShareWeb } from '@capacitor/share/dist/esm/web';

import { createMockUILog } from '../../test-utils/mock-services';
import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';

const NATIVE_ONLY = /only supported on native platforms/;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const EXPORT_DIR = 'Download/Beanconqueror_export';
const BACKUP_PREFIX = 'Beanconqueror_automatic_export_';
/** The bytes 0, 1, 2 and 255. */
const BYTES = new Uint8Array([0, 1, 2, 255]);
const BYTES_BASE64 = 'AAEC/w==';

function errorWithCode(code: string): Error {
  return Object.assign(new Error('Plugin error ' + code), { code });
}

/** Empties the files the web implementation keeps in IndexedDB. */
async function clearFiles(): Promise<void> {
  await (Filesystem as unknown as FilesystemWeb).clear();
}

async function namesIn(path: string, directory: Directory): Promise<string[]> {
  const { files } = await Filesystem.readdir({ path, directory });
  return files.map((file) => file.name).sort();
}

describe('UIFileHelper', () => {
  let fileHelper: UIFileHelper;
  let uiLog: { error: jasmine.Spy; info: jasmine.Spy };

  function setup(platforms: string[]): void {
    uiLog = Object.assign(createMockUILog(), {
      info: jasmine.createSpy('info'),
    });
    TestBed.configureTestingModule({
      providers: [
        UIFileHelper,
        {
          provide: Platform,
          useValue: {
            is: (_name: string) => platforms.includes(_name),
            platforms: () => platforms,
          },
        },
        { provide: UILog, useValue: uiLog },
      ],
    });
    fileHelper = TestBed.inject(UIFileHelper);
  }

  // Android: the app data directory is Directory.Data.
  const setupAndroid = () => setup(['capacitor', 'android']);
  const setupIos = () => setup(['capacitor', 'ios']);
  const setupBrowser = () => setup(['desktop', 'mobileweb']);

  beforeEach(clearFiles);
  afterEach(clearFiles);

  describe('getDataDirectory', () => {
    it('is the documents directory on iOS', () => {
      setupIos();
      expect(fileHelper.getDataDirectory()).toBe(Directory.Documents);
    });

    it('is the data directory on Android', () => {
      setupAndroid();
      expect(fileHelper.getDataDirectory()).toBe(Directory.Data);
    });

    it('throws in the browser', () => {
      setupBrowser();
      expect(() => fileHelper.getDataDirectory()).toThrowError(
        'Unsupported platform: ["desktop","mobileweb"]',
      );
    });

    it('throws for iOS or Android without capacitor', () => {
      setup(['ios', 'android', 'mobileweb']);
      expect(() => fileHelper.getDataDirectory()).toThrowError(
        /Unsupported platform/,
      );
    });
  });

  describe('normalizeFileName', () => {
    beforeEach(setupAndroid);

    it('removes exactly one leading slash', () => {
      expect(fileHelper.normalizeFileName('/photo.png')).toBe('photo.png');
      expect(fileHelper.normalizeFileName('//photo.png')).toBe('/photo.png');
    });

    it('leaves other names as they are', () => {
      expect(fileHelper.normalizeFileName('photo.png')).toBe('photo.png');
      expect(fileHelper.normalizeFileName('a/b/')).toBe('a/b/');
      expect(fileHelper.normalizeFileName('')).toBe('');
    });
  });

  describe('without capacitor', () => {
    beforeEach(setupBrowser);

    const blob = new Blob([BYTES]);
    const operations: Record<string, () => Promise<unknown>> = {
      readFileAsText: () => fileHelper.readFileAsText('a.txt', Directory.Data),
      readFileAsBase64: () =>
        fileHelper.readFileAsBase64('a.txt', Directory.Data),
      readFileAsUint8Array: () =>
        fileHelper.readFileAsUint8Array('a.txt', Directory.Data),
      readJSONFile: () => fileHelper.readJSONFile('a.json', Directory.Data),
      writeFileFromText: () =>
        fileHelper.writeFileFromText('text', 'a.txt', Directory.Data),
      writeFileFromBase64: () =>
        fileHelper.writeFileFromBase64(BYTES_BASE64, 'a.bin', Directory.Data),
      writeFileFromBlob: () =>
        fileHelper.writeFileFromBlob(blob, 'a.bin', Directory.Data),
      writeExternalFileFromBase64ForSharing: () =>
        fileHelper.writeExternalFileFromBase64ForSharing(BYTES_BASE64, 'a.bin'),
      deleteFile: () => fileHelper.deleteFile('a.txt', Directory.Data),
      deleteExternalSharedFile: () =>
        fileHelper.deleteExternalSharedFile('a.txt'),
      listAutomaticBackupFiles: () => fileHelper.listAutomaticBackupFiles(),
      deleteZIPBackupsOlderThanSevenDays: () =>
        fileHelper.deleteZIPBackupsOlderThanSevenDays(),
      duplicateInternalFile: () => fileHelper.duplicateInternalFile('a.txt'),
    };

    for (const [name, operation] of Object.entries(operations)) {
      it(`${name} rejects as only supported on native platforms`, async () => {
        await expectAsync(operation()).toBeRejectedWithError(
          Error,
          NATIVE_ONLY,
        );
      });
    }

    it('writes and deletes nothing', async () => {
      await Filesystem.writeFile({
        path: 'kept.txt',
        data: 'kept',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });

      await expectAsync(
        fileHelper.writeFileFromText('new', 'new.txt', Directory.Data),
      ).toBeRejected();
      await expectAsync(
        fileHelper.deleteFile('kept.txt', Directory.Data),
      ).toBeRejected();

      expect(await namesIn('', Directory.Data)).toEqual(['kept.txt']);
    });

    const internalOperations: Record<string, () => Promise<unknown>> = {
      readInternalFileAsText: () => fileHelper.readInternalFileAsText('a.txt'),
      readInternalFileAsBase64: () =>
        fileHelper.readInternalFileAsBase64('a.txt'),
      readInternalFileAsUint8Array: () =>
        fileHelper.readInternalFileAsUint8Array('a.txt'),
      readInternalJSONFile: () => fileHelper.readInternalJSONFile('a.json'),
      writeInternalFileFromText: () =>
        fileHelper.writeInternalFileFromText('text', 'a.txt'),
      writeInternalFileFromBase64: () =>
        fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'a.bin'),
      writeInternalFileFromBlob: () =>
        fileHelper.writeInternalFileFromBlob(blob, 'a.bin'),
      deleteInternalFile: () => fileHelper.deleteInternalFile('a.txt'),
      generateInternalPath: () => fileHelper.generateInternalPath('a', '.txt'),
      makeParentDirsInternal: () =>
        Promise.resolve().then(() =>
          fileHelper.makeParentDirsInternal('a/b.txt'),
        ),
    };

    // They ask for the app data directory first, which the browser has not.
    for (const [name, operation] of Object.entries(internalOperations)) {
      it(`${name} rejects as unsupported platform`, async () => {
        await expectAsync(operation()).toBeRejectedWithError(
          Error,
          /Unsupported platform/,
        );
      });
    }

    it('statInternalFile gives nothing', async () => {
      expect(await fileHelper.statInternalFile('a.txt')).toBeUndefined();
    });

    it('getInternalFileSrc gives an empty source', async () => {
      expect(await fileHelper.getInternalFileSrc('a.png')).toBe('');
    });
  });

  describe('text files', () => {
    beforeEach(setupAndroid);

    it('reads back the text it wrote and gives the relative path', async () => {
      const text = 'Größe: 18,5 g – Ærø ☕ 👍\nzweite Zeile';

      const path = await fileHelper.writeInternalFileFromText(text, 'note.txt');

      expect(path).toBe('note.txt');
      expect(await fileHelper.readInternalFileAsText('note.txt')).toBe(text);
      // A leading slash names the same file.
      expect(await fileHelper.readInternalFileAsText('/note.txt')).toBe(text);
    });

    it('writes into the app data directory', async () => {
      await fileHelper.writeInternalFileFromText('text', 'note.txt');

      const file = await Filesystem.stat({
        path: 'note.txt',
        directory: Directory.Data,
      });
      expect(file.type).toBe('file');
      expect(file.uri).toBe('/DATA/note.txt');
    });

    it('replaces an existing file', async () => {
      await fileHelper.writeInternalFileFromText('first', 'note.txt');
      await fileHelper.writeInternalFileFromText('second', 'note.txt');

      expect(await fileHelper.readInternalFileAsText('note.txt')).toBe(
        'second',
      );
      expect(await namesIn('', Directory.Data)).toEqual(['note.txt']);
    });

    it('creates the parent folders', async () => {
      const path = await fileHelper.writeFileFromText(
        'profile',
        'graphs/brews/flow.json',
        Directory.Data,
      );

      expect(path).toBe('graphs/brews/flow.json');
      const folder = await Filesystem.stat({
        path: 'graphs/brews',
        directory: Directory.Data,
      });
      expect(folder.type).toBe('directory');
      expect(
        await fileHelper.readFileAsText(
          'graphs/brews/flow.json',
          Directory.Data,
        ),
      ).toBe('profile');
    });

    it('rejects reading a file that does not exist', async () => {
      await expectAsync(
        fileHelper.readInternalFileAsText('missing.txt'),
      ).toBeRejected();
    });

    // On a device the plugin answers with base64 unless it is asked for text;
    // the web implementation gives back what was written either way.
    it('asks the plugin for UTF-8 text', async () => {
      const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();
      await fileHelper.writeInternalFileFromText('text', 'note.txt');

      await fileHelper.readInternalFileAsText('note.txt');
      await fileHelper.readInternalFileAsBase64('note.txt');

      expect(read.calls.argsFor(0)[0].encoding).toBe(Encoding.UTF8);
      expect(read.calls.argsFor(1)[0].encoding).toBeUndefined();
    });

    it('rejects when the plugin gives a Blob instead of text', async () => {
      await Filesystem.writeFile({
        path: 'blob.bin',
        data: new Blob([BYTES]),
        directory: Directory.Data,
      });

      await expectAsync(
        fileHelper.readInternalFileAsText('blob.bin'),
      ).toBeRejectedWithError(Error, /returned a Blob/);
    });
  });

  describe('binary files', () => {
    beforeEach(setupAndroid);

    it('reads back the base64 it wrote and gives path and full path', async () => {
      const result = await fileHelper.writeInternalFileFromBase64(
        BYTES_BASE64,
        'photo.png',
      );

      expect(result).toEqual({
        path: 'photo.png',
        fullpath: '/DATA/photo.png',
      });
      expect(await fileHelper.readInternalFileAsBase64('/photo.png')).toBe(
        BYTES_BASE64,
      );
    });

    it('creates the parent folders', async () => {
      const result = await fileHelper.writeFileFromBase64(
        BYTES_BASE64,
        'photos/2026/photo.png',
        Directory.Data,
      );

      expect(result.path).toBe('photos/2026/photo.png');
      expect(await namesIn('photos/2026', Directory.Data)).toEqual([
        'photo.png',
      ]);
    });

    it('writes the file for sharing into the external directory', async () => {
      const result = await fileHelper.writeExternalFileFromBase64ForSharing(
        BYTES_BASE64,
        'share.png',
      );

      expect(result).toEqual({
        path: 'share.png',
        fullpath: '/EXTERNAL/share.png',
      });
      expect(
        await fileHelper.readFileAsBase64('share.png', Directory.External),
      ).toBe(BYTES_BASE64);
      expect(await namesIn('', Directory.Data)).toEqual([]);
    });

    it('gives the bytes of a file', async () => {
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      const bytes = await fileHelper.readInternalFileAsUint8Array('/photo.png');

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(bytes)).toEqual([0, 1, 2, 255]);
    });

    it('rejects reading a file that does not exist', async () => {
      await expectAsync(
        fileHelper.readInternalFileAsBase64('missing.png'),
      ).toBeRejected();
      await expectAsync(
        fileHelper.readInternalFileAsUint8Array('missing.png'),
      ).toBeRejected();
    });

    it('rejects when the plugin gives a Blob instead of base64', async () => {
      await Filesystem.writeFile({
        path: 'blob.bin',
        data: new Blob([BYTES]),
        directory: Directory.Data,
      });

      await expectAsync(
        fileHelper.readInternalFileAsBase64('blob.bin'),
      ).toBeRejectedWithError(Error, /returned a Blob/);
    });

    for (const [title, type] of [
      ['a zip blob', 'application/zip'],
      ['a blob without type', ''],
    ]) {
      it(`reads back the content of ${title}`, async () => {
        const result = await fileHelper.writeInternalFileFromBlob(
          new Blob([BYTES], { type }),
          'backup.zip',
        );

        expect(result).toEqual({
          path: 'backup.zip',
          fullpath: '/DATA/backup.zip',
        });
        expect(await fileHelper.readInternalFileAsBase64('backup.zip')).toBe(
          BYTES_BASE64,
        );
        expect(
          Array.from(
            await fileHelper.readInternalFileAsUint8Array('backup.zip'),
          ),
        ).toEqual([0, 1, 2, 255]);
      });
    }

    // Only the literal "data:*/*;base64" is removed, which no blob with a
    // real type has: removing the prefix is left to the plugin.
    it('known gap: hands the data URL of a blob to the plugin with its prefix', async () => {
      const writeFile = spyOn(
        FilesystemWeb.prototype,
        'writeFile',
      ).and.callThrough();
      const handedOver = async (type: string) => {
        await fileHelper.writeInternalFileFromBlob(
          new Blob([BYTES], { type }),
          'backup.zip',
        );
        return writeFile.calls.mostRecent().args[0].data;
      };

      expect(await handedOver('application/zip')).toBe(
        'data:application/zip;base64,' + BYTES_BASE64,
      );
      expect(await handedOver('')).toBe(
        'data:application/octet-stream;base64,' + BYTES_BASE64,
      );
      // Even the one type that matches keeps the comma of the data URL.
      expect(await handedOver('*/*')).toBe(',' + BYTES_BASE64);
    });
  });

  describe('JSON files', () => {
    beforeEach(setupAndroid);

    it('parses the file', async () => {
      const data = { BREWS: [{ name: 'Früh', grind_weight: 18.5 }], n: null };
      await fileHelper.writeInternalFileFromText(
        JSON.stringify(data),
        'Beanconqueror.json',
      );

      expect(
        await fileHelper.readInternalJSONFile('Beanconqueror.json'),
      ).toEqual(data);
      expect(uiLog.error).not.toHaveBeenCalled();
    });

    it('logs and rejects when the file is not JSON', async () => {
      await fileHelper.writeInternalFileFromText('{"BREWS": [', 'broken.json');

      await expectAsync(
        fileHelper.readInternalJSONFile('broken.json'),
      ).toBeRejectedWithError(SyntaxError);
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });

    it('logs and rejects when the file is empty', async () => {
      await fileHelper.writeInternalFileFromText('', 'empty.json');

      await expectAsync(
        fileHelper.readInternalJSONFile('empty.json'),
      ).toBeRejectedWithError(SyntaxError);
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });

    it('logs and rejects when the file does not exist', async () => {
      await expectAsync(
        fileHelper.readInternalJSONFile('missing.json'),
      ).toBeRejected();
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });

    it('known gap: a leading slash is not removed from the name', async () => {
      const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();
      await fileHelper.writeInternalFileFromText('{}', 'data.json');

      await fileHelper.readInternalJSONFile('/data.json');
      await fileHelper.readInternalFileAsText('/data.json');

      // The web implementation removes the slash itself, so both are found.
      expect(read.calls.argsFor(0)[0].path).toBe('/data.json');
      expect(read.calls.argsFor(1)[0].path).toBe('data.json');
    });
  });

  describe('deleting and looking up files', () => {
    beforeEach(setupAndroid);

    it('tells whether a file exists', async () => {
      await fileHelper.writeInternalFileFromText('text', 'note.txt');

      expect(
        await fileHelper.fileExists({
          path: 'note.txt',
          directory: Directory.Data,
        }),
      ).toBeTrue();
      expect(
        await fileHelper.fileExists({
          path: 'other.txt',
          directory: Directory.Data,
        }),
      ).toBeFalse();
      // The same name in another directory is another file.
      expect(
        await fileHelper.fileExists({
          path: 'note.txt',
          directory: Directory.External,
        }),
      ).toBeFalse();
    });

    it('gives the file in the app data directory', async () => {
      await fileHelper.writeInternalFileFromText('zip', 'backup.zip');

      const file = await fileHelper.statInternalFile('/backup.zip');

      expect(file?.type).toBe('file');
      expect(file?.size).toBe(3);
    });

    it('gives nothing when there is no such file', async () => {
      expect(await fileHelper.statInternalFile('backup.zip')).toBeUndefined();
    });

    it('deletes the file and leaves the others', async () => {
      await fileHelper.writeInternalFileFromText('a', 'a.txt');
      await fileHelper.writeInternalFileFromText('b', 'b.txt');

      await fileHelper.deleteInternalFile('a.txt');

      expect(
        await fileHelper.fileExists({
          path: 'a.txt',
          directory: Directory.Data,
        }),
      ).toBeFalse();
      expect(await namesIn('', Directory.Data)).toEqual(['b.txt']);
    });

    it('deletes a shared file from the external directory only', async () => {
      await fileHelper.writeExternalFileFromBase64ForSharing(
        BYTES_BASE64,
        'share.png',
      );
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'share.png');

      await fileHelper.deleteExternalSharedFile('share.png');

      expect(await namesIn('', Directory.External)).toEqual([]);
      expect(await namesIn('', Directory.Data)).toEqual(['share.png']);
    });

    it('rejects deleting a file that does not exist', async () => {
      await expectAsync(
        fileHelper.deleteFile('missing.txt', Directory.Data),
      ).toBeRejected();
      await expectAsync(
        fileHelper.deleteInternalFile('missing.txt'),
      ).toBeRejected();
    });
  });

  describe('generateInternalPath', () => {
    beforeEach(setupAndroid);

    it('gives prefix, uuid and extension', async () => {
      const path = await fileHelper.generateInternalPath('brew', '.jpg');

      expect(path).toMatch(new RegExp(`^brew_${UUID}\\.jpg$`));
    });

    it('creates no file', async () => {
      await fileHelper.generateInternalPath('brew', '.jpg');

      expect(await namesIn('', Directory.Data)).toEqual([]);
    });

    it('draws again while a file of that name exists', async () => {
      type Uuid = ReturnType<typeof crypto.randomUUID>;
      spyOn(crypto, 'randomUUID').and.returnValues(
        'taken-1' as Uuid,
        'taken-2' as Uuid,
        'free' as Uuid,
      );
      await fileHelper.writeInternalFileFromText('1', 'brew_taken-1.jpg');
      await fileHelper.writeInternalFileFromText('2', 'brew_taken-2.jpg');

      expect(await fileHelper.generateInternalPath('brew', '.jpg')).toBe(
        'brew_free.jpg',
      );
    });
  });

  describe('duplicateInternalFile', () => {
    beforeEach(setupAndroid);

    it('copies the file under a new name with the same extension', async () => {
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      const copy = await fileHelper.duplicateInternalFile('photo.png');

      expect(copy).toMatch(new RegExp(`^duplicate_${UUID}\\.png$`));
      expect(await fileHelper.readInternalFileAsBase64(copy)).toBe(
        BYTES_BASE64,
      );
      expect(await fileHelper.readInternalFileAsBase64('photo.png')).toBe(
        BYTES_BASE64,
      );
      expect(await namesIn('', Directory.Data)).toEqual(
        [copy, 'photo.png'].sort(),
      );
    });

    it('copies a text file with its content', async () => {
      const profile = '{"weight":[{"t":"00:01","v":2.5}]}';
      await fileHelper.writeInternalFileFromText(profile, 'flow.json');

      const copy = await fileHelper.duplicateInternalFile('flow.json');

      expect(copy).toMatch(new RegExp(`^duplicate_${UUID}\\.json$`));
      expect(await fileHelper.readInternalFileAsText(copy)).toBe(profile);
    });

    it('puts the copy of a file in a folder into the data directory itself', async () => {
      await fileHelper.writeFileFromText(
        'profile',
        'graphs/flow.json',
        Directory.Data,
      );

      const copy = await fileHelper.duplicateInternalFile('graphs/flow.json');

      expect(copy).toMatch(new RegExp(`^duplicate_${UUID}\\.json$`));
      expect(await namesIn('graphs', Directory.Data)).toEqual(['flow.json']);
      expect(await fileHelper.readInternalFileAsText(copy)).toBe('profile');
    });

    it('known gap: a name without a dot gives its last letter as extension', async () => {
      await fileHelper.writeInternalFileFromText('text', 'notes');

      const copy = await fileHelper.duplicateInternalFile('notes');

      expect(copy).toMatch(new RegExp(`^duplicate_${UUID}s$`));
      expect(await fileHelper.readInternalFileAsText(copy)).toBe('text');
    });

    it('rejects and copies nothing when the file does not exist', async () => {
      await expectAsync(
        fileHelper.duplicateInternalFile('missing.png'),
      ).toBeRejected();

      expect(await namesIn('', Directory.Data)).toEqual([]);
    });
  });

  describe('makeParentDirs', () => {
    beforeEach(setupAndroid);

    it('creates the folders above the file', async () => {
      await fileHelper.makeParentDirs('graphs/brews/flow.json', Directory.Data);

      expect(await namesIn('', Directory.Data)).toEqual(['graphs']);
      expect(await namesIn('graphs', Directory.Data)).toEqual(['brews']);
      expect(await namesIn('graphs/brews', Directory.Data)).toEqual([]);
    });

    it('creates the folders in the app data directory', async () => {
      await fileHelper.makeParentDirsInternal('graphs/flow.json');

      const folder = await Filesystem.stat({
        path: 'graphs',
        directory: Directory.Data,
      });
      expect(folder.type).toBe('directory');
    });

    it('creates nothing for a file in the directory itself', async () => {
      await fileHelper.makeParentDirs('flow.json', Directory.Data);
      await fileHelper.makeParentDirs('/flow.json', Directory.Data);
      await fileHelper.makeParentDirs('flow', Directory.Data);

      expect(await namesIn('', Directory.Data)).toEqual([]);
    });

    it('ignores that the folder exists already (OS-PLUG-FILE-0010)', async () => {
      spyOn(FilesystemWeb.prototype, 'mkdir').and.rejectWith(
        errorWithCode('OS-PLUG-FILE-0010'),
      );

      await expectAsync(
        fileHelper.makeParentDirs('graphs/flow.json', Directory.Data),
      ).toBeResolved();
    });

    it('rejects with every other error', async () => {
      const error = errorWithCode('OS-PLUG-FILE-0013');
      spyOn(FilesystemWeb.prototype, 'mkdir').and.rejectWith(error);

      await expectAsync(
        fileHelper.makeParentDirs('graphs/flow.json', Directory.Data),
      ).toBeRejectedWith(error);
    });
  });

  describe('automatic backups', () => {
    beforeEach(setupAndroid);

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    function today(year: number, month: number, day: number): void {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(year, month - 1, day, 12, 0, 0));
    }

    async function writeExported(...names: string[]): Promise<void> {
      for (const name of names) {
        await Filesystem.writeFile({
          path: `${EXPORT_DIR}/${name}`,
          data: 'zip',
          directory: Directory.External,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      }
    }

    async function makeExportedFolder(name: string): Promise<void> {
      await Filesystem.mkdir({
        path: `${EXPORT_DIR}/${name}`,
        directory: Directory.External,
        recursive: true,
      });
    }

    const exported = () => namesIn(EXPORT_DIR, Directory.External);
    const backup = (day: string) => `${BACKUP_PREFIX}${day}.zip`;

    describe('listAutomaticBackupFiles', () => {
      it('gives the files with the name of an automatic backup', async () => {
        await writeExported(
          backup('01_03_2026'),
          backup('02_03_2026'),
          'Beanconqueror.zip',
          'Beanconqueror_pre_import_1.zip',
          'x' + backup('03_03_2026'),
        );
        await makeExportedFolder(backup('04_03_2026'));

        const files = await fileHelper.listAutomaticBackupFiles();

        expect(files.map((file) => file.name).sort()).toEqual([
          backup('01_03_2026'),
          backup('02_03_2026'),
        ]);
        // What the restore reads the backup with.
        const first = files.find((file) => file.name === backup('01_03_2026'));
        expect(first.type).toBe('file');
        expect(first.size).toBe(3);
        expect(first.uri).toBe(
          `/EXTERNAL/${EXPORT_DIR}/${backup('01_03_2026')}`,
        );
        expect(await fileHelper.readFileAsText(first.uri)).toBe('zip');
      });

      it('takes every name with the prefix, whatever follows', async () => {
        await writeExported(BACKUP_PREFIX + 'copy.json', BACKUP_PREFIX);

        const files = await fileHelper.listAutomaticBackupFiles();

        expect(files.map((file) => file.name).sort()).toEqual([
          BACKUP_PREFIX,
          BACKUP_PREFIX + 'copy.json',
        ]);
      });

      it('gives an empty list for an empty folder', async () => {
        await makeExportedFolder('other');

        expect(await fileHelper.listAutomaticBackupFiles()).toEqual([]);
      });

      it('gives an empty list when the folder is missing (OS-PLUG-FILE-0008)', async () => {
        spyOn(FilesystemWeb.prototype, 'readdir').and.rejectWith(
          errorWithCode('OS-PLUG-FILE-0008'),
        );

        expect(await fileHelper.listAutomaticBackupFiles()).toEqual([]);
        expect(uiLog.error).not.toHaveBeenCalled();
      });

      it('logs and rejects with every other error', async () => {
        const error = errorWithCode('OS-PLUG-FILE-0007');
        spyOn(FilesystemWeb.prototype, 'readdir').and.rejectWith(error);

        await expectAsync(
          fileHelper.listAutomaticBackupFiles(),
        ).toBeRejectedWith(error);
        expect(uiLog.error).toHaveBeenCalledTimes(1);
      });

      it('rejects with an error that has no code', async () => {
        // The web implementation: the folder was never created.
        await expectAsync(
          fileHelper.listAutomaticBackupFiles(),
        ).toBeRejectedWithError('Folder does not exist.');
      });
    });

    describe('deleteZIPBackupsOlderThanSevenDays', () => {
      // Today and the seven days before it are kept: eight files, not seven.
      it('keeps the backups of today and of the seven days before, deletes the older ones', async () => {
        today(2026, 3, 20);
        await writeExported(
          backup('20_03_2026'),
          backup('19_03_2026'),
          backup('14_03_2026'),
          backup('13_03_2026'),
          backup('12_03_2026'),
          backup('11_03_2026'),
          backup('20_02_2026'),
          backup('20_03_2025'),
        );

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual(
          [
            backup('20_03_2026'),
            backup('19_03_2026'),
            backup('14_03_2026'),
            backup('13_03_2026'),
          ].sort(),
        );
      });

      it('counts the days across the end of a month', async () => {
        today(2026, 3, 3);
        await writeExported(
          backup('03_03_2026'),
          backup('01_03_2026'),
          backup('28_02_2026'),
          backup('24_02_2026'),
          backup('23_02_2026'),
          backup('29_02_2026'),
        );

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual(
          [
            backup('03_03_2026'),
            backup('01_03_2026'),
            backup('28_02_2026'),
            backup('24_02_2026'),
          ].sort(),
        );
      });

      it('counts the days across the end of a year', async () => {
        today(2026, 1, 3);
        await writeExported(
          backup('03_01_2026'),
          backup('01_01_2026'),
          backup('31_12_2025'),
          backup('27_12_2025'),
          backup('26_12_2025'),
          backup('03_01_2025'),
        );

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual(
          [
            backup('03_01_2026'),
            backup('01_01_2026'),
            backup('31_12_2025'),
            backup('27_12_2025'),
          ].sort(),
        );
      });

      it('never deletes files with another name or folders', async () => {
        today(2026, 3, 20);
        await writeExported(
          'Beanconqueror.zip',
          'Beanconqueror_pre_import_01_01_2020.zip',
          'x' + backup('01_01_2020'),
          'beanconqueror_automatic_export_01_01_2020.zip',
        );
        await makeExportedFolder(backup('01_01_2020'));

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual(
          [
            'Beanconqueror.zip',
            'Beanconqueror_pre_import_01_01_2020.zip',
            'x' + backup('01_01_2020'),
            'beanconqueror_automatic_export_01_01_2020.zip',
            backup('01_01_2020'),
          ].sort(),
        );
      });

      it('leaves files in other folders alone', async () => {
        today(2026, 3, 20);
        await writeExported(backup('01_01_2020'));
        await fileHelper.writeInternalFileFromText('zip', backup('01_01_2020'));
        await fileHelper.writeFileFromText(
          'zip',
          'Download/' + backup('01_01_2020'),
          Directory.External,
        );

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual([]);
        expect(await namesIn('', Directory.Data)).toEqual([
          backup('01_01_2020'),
        ]);
        expect(await namesIn('Download', Directory.External)).toEqual(
          ['Beanconqueror_export', backup('01_01_2020')].sort(),
        );
      });

      // Only the eight exact names are kept; everything else with the prefix
      // goes, also what is newer than today.
      it('known gap: deletes prefixed files of a future day and with any other ending', async () => {
        today(2026, 3, 20);
        await writeExported(
          backup('20_03_2026'),
          backup('21_03_2026'),
          BACKUP_PREFIX + '20_03_2026 (1).zip',
          BACKUP_PREFIX + '20_03_2026.json',
          BACKUP_PREFIX + 'kept_by_hand.zip',
        );

        await fileHelper.deleteZIPBackupsOlderThanSevenDays();

        expect(await exported()).toEqual([backup('20_03_2026')]);
      });

      it('goes on with the other files when one cannot be deleted', async () => {
        today(2026, 3, 20);
        await writeExported(
          backup('01_01_2020'),
          backup('02_01_2020'),
          backup('03_01_2020'),
          backup('20_03_2026'),
        );
        const original = Reflect.get(FilesystemWeb.prototype, 'deleteFile');
        const deleteFile = spyOn(FilesystemWeb.prototype, 'deleteFile');
        deleteFile.and.callFake(async function (this: FilesystemWeb, options) {
          if (options.path.endsWith(backup('02_01_2020'))) {
            throw new Error('locked');
          }
          await original.call(this, options);
        });

        await expectAsync(
          fileHelper.deleteZIPBackupsOlderThanSevenDays(),
        ).toBeResolved();

        expect(await exported()).toEqual(
          [backup('02_01_2020'), backup('20_03_2026')].sort(),
        );
        expect(uiLog.error).toHaveBeenCalledTimes(1);
      });

      it('does nothing in an empty folder', async () => {
        today(2026, 3, 20);
        await makeExportedFolder('other');

        await expectAsync(
          fileHelper.deleteZIPBackupsOlderThanSevenDays(),
        ).toBeResolved();

        expect(await exported()).toEqual(['other']);
      });

      // Unlike listAutomaticBackupFiles, a folder that is only missing
      // counts as an error here.
      it('logs and rejects when the folder cannot be read, also when it is missing (OS-PLUG-FILE-0008)', async () => {
        const error = errorWithCode('OS-PLUG-FILE-0008');
        spyOn(FilesystemWeb.prototype, 'readdir').and.rejectWith(error);

        await expectAsync(
          fileHelper.deleteZIPBackupsOlderThanSevenDays(),
        ).toBeRejectedWith(error);
        expect(uiLog.error).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('exporting a file', () => {
    let share: jasmine.Spy;

    beforeEach(() => {
      share = spyOn(ShareWeb.prototype, 'share').and.resolveTo({});
    });

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    describe('on a device', () => {
      beforeEach(setupAndroid);

      it('writes the file, gives its URI and shares it', async () => {
        const uri = await fileHelper.exportFile(
          {
            fileName: 'Beanconqueror.zip',
            path: 'exports/today',
            directory: Directory.Cache,
          },
          new Blob([BYTES], { type: 'application/zip' }),
        );

        expect(uri).toBe('/CACHE/exports/today/Beanconqueror.zip');
        expect(
          await fileHelper.readFileAsBase64(
            'exports/today/Beanconqueror.zip',
            Directory.Cache,
          ),
        ).toBe(BYTES_BASE64);
        expect(share).toHaveBeenCalledOnceWith({ url: uri });
      });

      it('does not share when asked not to', async () => {
        const uri = await fileHelper.exportFile(
          {
            fileName: 'Beanconqueror.zip',
            path: 'exports',
            directory: Directory.Cache,
          },
          new Blob([BYTES]),
          false,
        );

        expect(uri).toBe('/CACHE/exports/Beanconqueror.zip');
        expect(await namesIn('exports', Directory.Cache)).toEqual([
          'Beanconqueror.zip',
        ]);
        expect(share).not.toHaveBeenCalled();
      });

      it('rejects when sharing fails, the file stays written', async () => {
        share.and.rejectWith(new Error('Share canceled'));

        await expectAsync(
          fileHelper.exportFile(
            {
              fileName: 'Beanconqueror.zip',
              path: 'exports',
              directory: Directory.Cache,
            },
            new Blob([BYTES]),
          ),
        ).toBeRejectedWithError('Share canceled');

        expect(await namesIn('exports', Directory.Cache)).toEqual([
          'Beanconqueror.zip',
        ]);
      });

      it('exports into the export folder of the external directory by default', async () => {
        const uri = await fileHelper.exportFileToDefaultDirectory(
          'Beanconqueror.xlsx',
          new Blob([BYTES]),
        );

        expect(uri).toBe(`/EXTERNAL/${EXPORT_DIR}/Beanconqueror.xlsx`);
        expect(await namesIn(EXPORT_DIR, Directory.External)).toEqual([
          'Beanconqueror.xlsx',
        ]);
        expect(await fileHelper.readFileAsBase64(uri)).toBe(BYTES_BASE64);
        expect(share).toHaveBeenCalledOnceWith({ url: uri });
      });

      it('exports into the default folder without sharing', async () => {
        const uri = await fileHelper.exportFileToDefaultDirectory(
          'Beanconqueror.xlsx',
          new Blob([BYTES]),
          false,
        );

        expect(uri).toBe(`/EXTERNAL/${EXPORT_DIR}/Beanconqueror.xlsx`);
        expect(share).not.toHaveBeenCalled();
      });
    });

    describe('in the browser', () => {
      let clicked: { href: string; download: string; attached: boolean }[];
      let writeFile: jasmine.Spy;
      let createObjectURL: jasmine.Spy;

      beforeEach(() => {
        setupBrowser();
        clicked = [];
        createObjectURL = spyOn(URL, 'createObjectURL').and.returnValue(
          'blob:export',
        );
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (
          this: HTMLAnchorElement,
        ) {
          clicked.push({
            href: this.getAttribute('href'),
            download: this.getAttribute('download'),
            attached: document.body.contains(this),
          });
        });
        writeFile = spyOn(FilesystemWeb.prototype, 'writeFile');
        jasmine.clock().install();
      });

      for (const [name, exportIt] of Object.entries({
        exportFile: (blob: Blob) =>
          fileHelper.exportFile(
            {
              fileName: 'Beanconqueror.zip',
              path: 'exports',
              directory: Directory.Cache,
            },
            blob,
          ),
        exportFileToDefaultDirectory: (blob: Blob) =>
          fileHelper.exportFileToDefaultDirectory('Beanconqueror.zip', blob),
      })) {
        it(`${name} offers the file as a download after 250 ms`, async () => {
          const blob = new Blob([BYTES]);

          const result = await exportIt(blob);

          expect(result).toBeUndefined();
          jasmine.clock().tick(249);
          expect(clicked).toEqual([]);
          jasmine.clock().tick(1);
          expect(clicked).toEqual([
            {
              href: 'blob:export',
              download: 'Beanconqueror.zip',
              attached: true,
            },
          ]);
          expect(createObjectURL).toHaveBeenCalledOnceWith(blob);
          // The link is gone again and nothing was written or shared.
          expect(document.querySelector('a[download]')).toBeNull();
          expect(writeFile).not.toHaveBeenCalled();
          expect(share).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('downloadExternalFile', () => {
    beforeEach(setupAndroid);

    it('stores the downloaded file under a new name in the app data directory', async () => {
      const fetched = spyOn(window, 'fetch').and.resolveTo(
        new Response(new Blob(['png'])),
      );

      const path = await fileHelper.downloadExternalFile(
        'https://example.invalid/bean.png',
      );

      expect(path).toMatch(new RegExp(`^download_image_${UUID}\\.png$`));
      expect(fetched.calls.argsFor(0)[0]).toBe(
        'https://example.invalid/bean.png',
      );
      expect((await fileHelper.statInternalFile(path))?.size).toBe(3);
    });

    it('uses the given prefix and extension', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response(new Blob(['jpg'])));

      const path = await fileHelper.downloadExternalFile(
        'https://example.invalid/bean',
        'roaster',
        '.jpg',
      );

      expect(path).toMatch(new RegExp(`^roaster_${UUID}\\.jpg$`));
      expect(await namesIn('', Directory.Data)).toEqual([path]);
    });

    it('rejects and stores nothing when the download fails', async () => {
      spyOn(window, 'fetch').and.rejectWith(new TypeError('Failed to fetch'));

      await expectAsync(
        fileHelper.downloadExternalFile('https://example.invalid/bean.png'),
      ).toBeRejectedWithError(TypeError);

      expect(await namesIn('', Directory.Data)).toEqual([]);
    });
  });

  describe('getInternalFileSrc', () => {
    const urlOf = (src: SafeResourceUrl) =>
      TestBed.inject(DomSanitizer).sanitize(SecurityContext.RESOURCE_URL, src);

    it('gives the trusted source of a file in the app data directory', async () => {
      setupAndroid();
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      expect(urlOf(await fileHelper.getInternalFileSrc('/photo.png'))).toBe(
        '/DATA/photo.png',
      );
      expect(urlOf(await fileHelper.getInternalFileSrc('photo.png'))).toBe(
        '/DATA/photo.png',
      );
    });

    it('drops the "Cloud/" in front of the name on iOS', async () => {
      setupIos();
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      expect(
        urlOf(await fileHelper.getInternalFileSrc('/Cloud/photo.png')),
      ).toBe('/DOCUMENTS/photo.png');
      expect(urlOf(await fileHelper.getInternalFileSrc('photo.png'))).toBe(
        '/DOCUMENTS/photo.png',
      );
    });

    it('keeps the "Cloud/" folder on Android', async () => {
      setupAndroid();
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');
      await fileHelper.writeInternalFileFromBase64(
        BYTES_BASE64,
        'Cloud/other.png',
      );

      expect(
        urlOf(await fileHelper.getInternalFileSrc('Cloud/other.png')),
      ).toBe('/DATA/Cloud/other.png');
      await expectAsync(
        fileHelper.getInternalFileSrc('Cloud/photo.png'),
      ).toBeRejected();
    });

    it('logs and rejects when the file does not exist', async () => {
      setupAndroid();

      await expectAsync(
        fileHelper.getInternalFileSrc('missing.png'),
      ).toBeRejectedWithError('Entry does not exist.');
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('createTempCacheDirectory', () => {
    beforeEach(setupAndroid);

    afterEach(() => {
      jasmine.clock().uninstall();
    });

    it('creates a folder named after prefix and time in the cache', async () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(1700000000000));

      const result = await fileHelper.createTempCacheDirectory('import');

      expect(result).toEqual({
        path: 'tempDirimport1700000000000',
        directory: Directory.Cache,
        uri: '/CACHE/tempDirimport1700000000000',
      });
      const folder = await Filesystem.stat({
        path: result.path,
        directory: Directory.Cache,
      });
      expect(folder.type).toBe('directory');
    });

    it('rejects when the folder exists already', async () => {
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(1700000000000));
      await fileHelper.createTempCacheDirectory('import');

      await expectAsync(
        fileHelper.createTempCacheDirectory('import'),
      ).toBeRejected();
    });
  });
});
