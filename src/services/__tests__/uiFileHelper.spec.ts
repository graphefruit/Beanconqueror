import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Platform } from '@ionic/angular';

import { Capacitor } from '@capacitor/core';
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
      replaceFileFromBlob: () =>
        fileHelper.replaceFileFromBlob(
          blob,
          'a.bin',
          'a.bin.part',
          Directory.Data,
        ),
      writeFileForSharing: () =>
        fileHelper.writeFileForSharing(BYTES_BASE64, 'a.bin'),
      deleteFile: () => fileHelper.deleteFile('a.txt', Directory.Data),
      listAutomaticBackupFiles: () => fileHelper.listAutomaticBackupFiles(),
      deleteOldAutomaticBackups: () => fileHelper.deleteOldAutomaticBackups(),
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
      replaceInternalFileFromBlob: () =>
        fileHelper.replaceInternalFileFromBlob(blob, 'a.bin', 'a.bin.part'),
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

  describe('replacing a file and keeping a copy', () => {
    const PATH = 'brews/a_flow_profile.json';
    const COPY = 'brews/a_flow_profile.before-cut.json';

    beforeEach(async () => {
      setupAndroid();
      await fileHelper.writeInternalFileFromText('original', PATH);
    });

    it('writes the new text and keeps the file from before', async () => {
      await fileHelper.replaceInternalFileKeepingCopy('cut', PATH, COPY);

      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('cut');
      expect(await fileHelper.readInternalFileAsText(COPY)).toBe('original');
      expect(await namesIn('brews', Directory.Data)).toEqual([
        'a_flow_profile.before-cut.json',
        'a_flow_profile.json',
      ]);
    });

    it('keeps only the copy from before the last replacing', async () => {
      await fileHelper.replaceInternalFileKeepingCopy('first cut', PATH, COPY);
      await fileHelper.replaceInternalFileKeepingCopy('second cut', PATH, COPY);

      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('second cut');
      expect(await fileHelper.readInternalFileAsText(COPY)).toBe('first cut');
      expect((await namesIn('brews', Directory.Data)).length).toBe(2);
    });

    it('replaces an older copy where copying refuses an existing file', async () => {
      await fileHelper.replaceInternalFileKeepingCopy('first cut', PATH, COPY);
      // As on iOS: copying onto a file that exists fails.
      spyOn(FilesystemWeb.prototype, 'copy').and.callFake(async (options) => {
        const name = options.to.split('/').pop();
        if ((await namesIn('brews', Directory.Data)).includes(name)) {
          throw new Error('file exists');
        }
        const { data } = await Filesystem.readFile({
          path: options.from,
          directory: options.directory,
          encoding: Encoding.UTF8,
        });
        await Filesystem.writeFile({
          path: options.to,
          directory: options.toDirectory,
          data,
          encoding: Encoding.UTF8,
        });
        return { uri: options.to };
      });

      await fileHelper.replaceInternalFileKeepingCopy('second cut', PATH, COPY);

      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('second cut');
      expect(await fileHelper.readInternalFileAsText(COPY)).toBe('first cut');
    });

    it('leaves the file as it was when the copy cannot be made', async () => {
      spyOn(FilesystemWeb.prototype, 'copy').and.rejectWith(
        new Error('disk full'),
      );

      await expectAsync(
        fileHelper.replaceInternalFileKeepingCopy('cut', PATH, COPY),
      ).toBeRejectedWithError('disk full');
      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('original');
    });

    it('leaves the file as it was when writing fails', async () => {
      spyOn(fileHelper, 'writeFileFromText').and.rejectWith(
        new Error('disk full'),
      );

      await expectAsync(
        fileHelper.replaceInternalFileKeepingCopy('cut', PATH, COPY),
      ).toBeRejectedWithError('disk full');
      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('original');
    });

    it('puts the copy back when renaming fails after the file was removed', async () => {
      const rename = spyOn(FilesystemWeb.prototype, 'rename');
      rename.and.callFake(async () => {
        rename.and.callThrough();
        // As on Android and iOS: the old file is gone before the move.
        await Filesystem.deleteFile({ path: PATH, directory: Directory.Data });
        throw new Error('rename failed');
      });

      await expectAsync(
        fileHelper.replaceInternalFileKeepingCopy('cut', PATH, COPY),
      ).toBeRejectedWithError('rename failed');
      expect(await fileHelper.readInternalFileAsText(PATH)).toBe('original');
      expect(await namesIn('brews', Directory.Data)).toEqual([
        'a_flow_profile.json',
      ]);
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

    it('gives the bytes of a file', async () => {
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      const bytes = await fileHelper.readInternalFileAsUint8Array('/photo.png');

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(bytes)).toEqual([0, 1, 2, 255]);
    });

    // The web implementation removes a leading slash itself, a device does
    // not, so what the plugin is asked for is checked.
    it('asks the plugin for the name without its leading slash', async () => {
      const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();
      const stat = spyOn(FilesystemWeb.prototype, 'stat').and.callThrough();
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      await fileHelper.readInternalFileAsBase64('/photo.png');
      await fileHelper.readInternalFileAsUint8Array('/photo.png');
      await fileHelper.statInternalFile('/photo.png');

      expect(read.calls.allArgs().map(([options]) => options.path)).toEqual([
        'photo.png',
        'photo.png',
      ]);
      expect(stat.calls.allArgs().map(([options]) => options.path)).toEqual([
        'photo.png',
      ]);
    });

    it('reads a photo stored with "Cloud/" in front of the name', async () => {
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      expect(await fileHelper.readInternalFileAsBase64('Cloud/photo.png')).toBe(
        BYTES_BASE64,
      );
    });

    it('asks for a "Cloud/" photo found nowhere as before', async () => {
      const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();

      await expectAsync(
        fileHelper.readInternalFileAsBase64('/Cloud/missing.png'),
      ).toBeRejected();

      expect(read.calls.allArgs().map(([options]) => options.path)).toEqual([
        'Cloud/missing.png',
      ]);
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
        const result = await fileHelper.writeFileFromBlob(
          new Blob([BYTES], { type }),
          'backup.zip',
          Directory.Data,
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
        await fileHelper.writeFileFromBlob(
          new Blob([BYTES], { type }),
          'backup.zip',
          Directory.Data,
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

    it('renames a file in the app data directory', async () => {
      await fileHelper.writeInternalFileFromText('zip', 'backup.zip.part');

      await fileHelper.renameInternalFile('backup.zip.part', 'backup.zip');

      expect(await namesIn('', Directory.Data)).toEqual(['backup.zip']);
      expect(await fileHelper.readInternalFileAsText('backup.zip')).toBe('zip');
    });

    it('rejects when the file to rename is not there', async () => {
      await expectAsync(
        fileHelper.renameInternalFile('backup.zip.part', 'backup.zip'),
      ).toBeRejected();
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

    it('copies a photo stored with "Cloud/" in front of the name', async () => {
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      const copy = await fileHelper.duplicateInternalFile('/Cloud/photo.png');

      expect(copy).toMatch(new RegExp(`^duplicate_${UUID}\\.png$`));
      expect(await fileHelper.readInternalFileAsBase64(copy)).toBe(
        BYTES_BASE64,
      );
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

    describe('replaceFileFromBlob', () => {
      const day = `${EXPORT_DIR}/${backup('02_03_2026')}`;
      const unfinished = 'Beanconqueror_automatic_export.zip.part';
      const replaceBackupOfTheDay = () =>
        fileHelper.replaceFileFromBlob(
          new Blob([BYTES]),
          day,
          `${EXPORT_DIR}/${unfinished}`,
          Directory.External,
        );
      const backupOfTheDay = () =>
        fileHelper.readFileAsBase64(day, Directory.External);
      /** Writes the first bytes of the file as a write does that is cut off. */
      function cutOffWrites(failing: boolean): jasmine.Spy {
        return spyOn(FilesystemWeb.prototype, 'writeFile').and.callFake(
          async (options) => {
            // Not through writeFile, which is replaced here.
            await Filesystem.appendFile({ ...options, data: 'AAE=' });
            if (failing) {
              throw new Error('disk full');
            }
            return { uri: '' };
          },
        );
      }

      it('writes a file that is not there yet, folders included', async () => {
        await replaceBackupOfTheDay();

        expect(await backupOfTheDay()).toBe(BYTES_BASE64);
        expect(await exported()).toEqual([backup('02_03_2026')]);
      });

      it('replaces the file and leaves no other one behind', async () => {
        await writeExported(backup('02_03_2026'));

        await replaceBackupOfTheDay();

        expect(await backupOfTheDay()).toBe(BYTES_BASE64);
        expect(await exported()).toEqual([backup('02_03_2026')]);
      });

      it('keeps the file from before while the new one is not complete', async () => {
        await writeExported(backup('02_03_2026'));
        const writing = cutOffWrites(false);
        // The system ends the app here: nothing follows the write.
        spyOn(FilesystemWeb.prototype, 'rename').and.returnValue(
          new Promise<void>(() => undefined),
        );

        void replaceBackupOfTheDay();
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(writing).toHaveBeenCalledTimes(1);
        expect(await fileHelper.readFileAsText(day, Directory.External)).toBe(
          'zip',
        );
        // What is left of the cut off file is no backup to choose or count.
        expect(await exported()).toEqual([unfinished, backup('02_03_2026')]);
        expect(
          (await fileHelper.listAutomaticBackupFiles()).map(
            (file) => file.name,
          ),
        ).toEqual([backup('02_03_2026')]);
      });

      it('deletes what a write that was cut off left behind before it writes', async () => {
        await writeExported(backup('01_03_2026'), unfinished);
        let whenWriting: string[] | undefined;
        spyOn(FilesystemWeb.prototype, 'writeFile').and.callFake(async () => {
          whenWriting = await exported();
          throw new Error('disk full');
        });

        await expectAsync(replaceBackupOfTheDay()).toBeRejectedWithError(
          'disk full',
        );

        expect(whenWriting).toEqual([backup('01_03_2026')]);
        expect(await exported()).toEqual([backup('01_03_2026')]);
      });

      it('deletes the cut off file and rejects when writing fails', async () => {
        await writeExported(backup('02_03_2026'));
        cutOffWrites(true);

        await expectAsync(replaceBackupOfTheDay()).toBeRejectedWithError(
          'disk full',
        );

        expect(await exported()).toEqual([backup('02_03_2026')]);
        expect(await fileHelper.readFileAsText(day, Directory.External)).toBe(
          'zip',
        );
      });

      it('deletes the new file and rejects when it cannot get its name', async () => {
        await writeExported(backup('02_03_2026'));
        spyOn(FilesystemWeb.prototype, 'rename').and.rejectWith(
          new Error('rename failed'),
        );

        await expectAsync(replaceBackupOfTheDay()).toBeRejectedWithError(
          'rename failed',
        );

        expect(await exported()).toEqual([backup('02_03_2026')]);
        expect(await fileHelper.readFileAsText(day, Directory.External)).toBe(
          'zip',
        );
      });

      /** Like the plugin on a device: the file is deleted, then moving fails. */
      function failMoving(): void {
        spyOn(FilesystemWeb.prototype, 'rename').and.callFake(
          async (options) => {
            await Filesystem.deleteFile({
              path: options.to,
              directory: options.toDirectory,
            }).catch(() => undefined);
            throw new Error('rename failed');
          },
        );
      }

      it('keeps the complete new file when renaming fails after the file from before was deleted', async () => {
        await writeExported(backup('02_03_2026'));
        failMoving();

        await expectAsync(replaceBackupOfTheDay()).toBeRejectedWithError(
          'rename failed',
        );

        expect(await exported()).toEqual([unfinished]);
        expect(
          await fileHelper.readFileAsBase64(
            `${EXPORT_DIR}/${unfinished}`,
            Directory.External,
          ),
        ).toBe(BYTES_BASE64);
        // It is no backup to choose or count, and the next write removes it.
        expect(await fileHelper.listAutomaticBackupFiles()).toEqual([]);
        (FilesystemWeb.prototype.rename as jasmine.Spy).and.callThrough();
        await replaceBackupOfTheDay();
        expect(await exported()).toEqual([backup('02_03_2026')]);
      });

      it('keeps the complete new file when renaming fails and there was no file before', async () => {
        failMoving();

        await expectAsync(replaceBackupOfTheDay()).toBeRejectedWithError(
          'rename failed',
        );

        expect(await exported()).toEqual([unfinished]);
      });

      it('keeps the complete internal backup when renaming fails after the one before was deleted', async () => {
        await fileHelper.writeInternalFileFromText('zip', 'Beanconqueror.zip');
        failMoving();

        await expectAsync(
          fileHelper.replaceInternalFileFromBlob(
            new Blob([BYTES]),
            'Beanconqueror.zip',
            'Beanconqueror.zip.part',
          ),
        ).toBeRejectedWithError('rename failed');

        expect(
          await fileHelper.statInternalFile('Beanconqueror.zip'),
        ).toBeUndefined();
        expect(
          await fileHelper.readInternalFileAsBase64('Beanconqueror.zip.part'),
        ).toBe(BYTES_BASE64);
      });

      it('never deletes an unfinished file as an old backup, the next write does', async () => {
        today(2026, 3, 20);
        await writeExported(unfinished, backup('01_03_2026'));

        await fileHelper.deleteOldAutomaticBackups();
        expect(await exported()).toContain(unfinished);

        await replaceBackupOfTheDay();
        expect(await exported()).toEqual([
          backup('01_03_2026'),
          backup('02_03_2026'),
        ]);
      });
    });

    describe('replaceInternalFileFromBlob', () => {
      it('replaces the file in the app data directory', async () => {
        await Filesystem.writeFile({
          path: 'Beanconqueror.zip',
          data: 'old',
          directory: Directory.Data,
          encoding: Encoding.UTF8,
        });

        await fileHelper.replaceInternalFileFromBlob(
          new Blob([BYTES]),
          'Beanconqueror.zip',
          'Beanconqueror.zip.part',
        );

        expect(
          await fileHelper.readInternalFileAsBase64('Beanconqueror.zip'),
        ).toBe(BYTES_BASE64);
        expect(await namesIn('', Directory.Data)).toEqual([
          'Beanconqueror.zip',
        ]);
      });
    });

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

    describe('deleteOldAutomaticBackups', () => {
      /** The backups of the days `first` to `last` of a month like 01_2020. */
      const backupsOf = (month: string, first: number, last: number) =>
        Array.from({ length: last - first + 1 }, (_, index) =>
          backup(`${String(first + index).padStart(2, '0')}_${month}`),
        );

      // Daily use: today and the seven days before it, eight files.
      it('keeps the eight newest backups, deletes the older ones', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('03_2026', 10, 20));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(backupsOf('03_2026', 13, 20));
      });

      it('keeps the eight newest backups however old they are', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('01_2025', 1, 10));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(backupsOf('01_2025', 3, 10));
      });

      it('keeps all of them when there are no more than eight', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('01_2020', 1, 8));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(backupsOf('01_2020', 1, 8));
      });

      // By the text of the names, 01_01_2026 and 02_02_2026 were the oldest.
      it('takes the newest by the day in the name, across months and years', async () => {
        today(2026, 12, 1);
        const kept = [
          backup('31_12_2025'),
          backup('01_01_2026'),
          backup('02_02_2026'),
          backup('03_03_2026'),
          backup('04_04_2026'),
          backup('05_05_2026'),
          backup('06_06_2026'),
          backup('07_07_2026'),
        ];
        await writeExported(
          backup('28_02_2025'),
          backup('30_11_2025'),
          ...kept,
        );

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual([...kept].sort());
      });

      it('keeps a backup of a future day and does not count it', async () => {
        today(2026, 3, 20);
        await writeExported(
          backup('21_03_2026'),
          backup('20_03_2026'),
          ...backupsOf('03_2026', 4, 11),
        );

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(
          [
            backup('21_03_2026'),
            backup('20_03_2026'),
            ...backupsOf('03_2026', 5, 11),
          ].sort(),
        );
      });

      // After a long break the real backups are still there.
      it('keeps the eight newest real backups when eight are of future days', async () => {
        today(2026, 3, 20);
        await writeExported(
          ...backupsOf('04_2026', 1, 8),
          ...backupsOf('01_2026', 1, 10),
        );

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(
          [
            ...backupsOf('04_2026', 1, 8),
            ...backupsOf('01_2026', 3, 10),
          ].sort(),
        );
      });

      // The backups before an import count on it, see canBeImportedAgain().
      it('keeps the backups of the last seven days', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('03_2026', 1, 20));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(backupsOf('03_2026', 13, 20));
      });

      it('never deletes files with another name or folders', async () => {
        today(2026, 3, 20);
        const others = [
          'Beanconqueror.zip',
          'Beanconqueror_pre_import_01_01_2019.zip',
          'x' + backup('01_01_2019'),
          'beanconqueror_automatic_export_01_01_2019.zip',
        ];
        await writeExported(...others, ...backupsOf('01_2020', 1, 9));
        await makeExportedFolder(backup('01_01_2019'));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(
          [
            ...others,
            backup('01_01_2019'),
            ...backupsOf('01_2020', 2, 9),
          ].sort(),
        );
      });

      it('leaves files in other folders alone', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('01_2020', 1, 9));
        await fileHelper.writeInternalFileFromText('zip', backup('01_01_2020'));
        await fileHelper.writeFileFromText(
          'zip',
          'Download/' + backup('01_01_2020'),
          Directory.External,
        );

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(backupsOf('01_2020', 2, 9));
        expect(await namesIn('', Directory.Data)).toEqual([
          backup('01_01_2020'),
        ]);
        expect(await namesIn('Download', Directory.External)).toEqual(
          ['Beanconqueror_export', backup('01_01_2020')].sort(),
        );
      });

      // A copy the user renamed or the system numbered is not ours to delete,
      // and does not take the place of a backup either.
      it('never deletes files that only start like a backup, and does not count them', async () => {
        today(2026, 3, 20);
        const others = [
          BACKUP_PREFIX + '01_01_2019 (1).zip',
          BACKUP_PREFIX + '01_01_2019.json',
          BACKUP_PREFIX + '01_01_2019.ZIP',
          BACKUP_PREFIX + '01_01_2019.zip.bak',
          BACKUP_PREFIX + '1_1_2019.zip',
          BACKUP_PREFIX + 'kept_by_hand.zip',
          // Not a day.
          backup('29_02_2019'),
          backup('01_13_2019'),
        ];
        await writeExported(...others, ...backupsOf('01_2020', 1, 9));

        await fileHelper.deleteOldAutomaticBackups();

        expect(await exported()).toEqual(
          [...others, ...backupsOf('01_2020', 2, 9)].sort(),
        );
      });

      it('goes on with the other files when one cannot be deleted', async () => {
        today(2026, 3, 20);
        await writeExported(...backupsOf('01_2020', 1, 11));
        const original = Reflect.get(FilesystemWeb.prototype, 'deleteFile');
        const deleteFile = spyOn(FilesystemWeb.prototype, 'deleteFile');
        deleteFile.and.callFake(async function (this: FilesystemWeb, options) {
          if (options.path.endsWith(backup('02_01_2020'))) {
            throw new Error('locked');
          }
          await original.call(this, options);
        });

        await expectAsync(
          fileHelper.deleteOldAutomaticBackups(),
        ).toBeResolved();

        expect(await exported()).toEqual(
          [backup('02_01_2020'), ...backupsOf('01_2020', 4, 11)].sort(),
        );
        expect(uiLog.error).toHaveBeenCalledTimes(1);
      });

      it('does nothing in an empty folder', async () => {
        today(2026, 3, 20);
        await makeExportedFolder('other');

        await expectAsync(
          fileHelper.deleteOldAutomaticBackups(),
        ).toBeResolved();

        expect(await exported()).toEqual(['other']);
      });

      // Unlike listAutomaticBackupFiles, a folder that is only missing
      // counts as an error here.
      it('logs and rejects when the folder cannot be read, also when it is missing (OS-PLUG-FILE-0008)', async () => {
        const error = errorWithCode('OS-PLUG-FILE-0008');
        spyOn(FilesystemWeb.prototype, 'readdir').and.rejectWith(error);

        await expectAsync(
          fileHelper.deleteOldAutomaticBackups(),
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

    // In the browser the URI is its own source; on a device only the
    // converted one can be loaded by the web view.
    it('gives the source the web view can load, not the file URI', async () => {
      setupAndroid();
      spyOn(Capacitor, 'convertFileSrc').and.callFake(
        (uri: string) => `https://localhost/_capacitor_file_${uri}`,
      );
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');

      expect(urlOf(await fileHelper.getInternalFileSrc('photo.png'))).toBe(
        'https://localhost/_capacitor_file_/DATA/photo.png',
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

    it('finds a photo with the "Cloud/" in front of the name on Android, preferring the file as stored', async () => {
      setupAndroid();
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'photo.png');
      await fileHelper.writeInternalFileFromBase64(BYTES_BASE64, 'other.png');
      await fileHelper.writeInternalFileFromBase64(
        BYTES_BASE64,
        'Cloud/other.png',
      );

      expect(
        urlOf(await fileHelper.getInternalFileSrc('/Cloud/photo.png')),
      ).toBe('/DATA/photo.png');
      expect(
        urlOf(await fileHelper.getInternalFileSrc('Cloud/other.png')),
      ).toBe('/DATA/Cloud/other.png');
    });

    it('finds a photo kept in a "Cloud/" folder on iOS when there is none without it', async () => {
      setupIos();
      await fileHelper.writeInternalFileFromBase64(
        BYTES_BASE64,
        'Cloud/photo.png',
      );

      expect(
        urlOf(await fileHelper.getInternalFileSrc('Cloud/photo.png')),
      ).toBe('/DOCUMENTS/Cloud/photo.png');
    });

    it('logs and rejects when the file does not exist', async () => {
      setupAndroid();

      await expectAsync(
        fileHelper.getInternalFileSrc('missing.png'),
      ).toBeRejectedWithError('Entry does not exist.');
      expect(uiLog.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('files to share', () => {
    for (const [platform, setupPlatform] of [
      ['Android', setupAndroid],
      ['iOS', setupIos],
    ] as const) {
      it(`writes them into the share folder of the cache on ${platform}`, async () => {
        setupPlatform();

        const result = await fileHelper.writeFileForSharing(
          BYTES_BASE64,
          'Beanconqueror_1.png',
        );

        expect(result).toEqual({
          path: 'share/Beanconqueror_1.png',
          fullpath: '/CACHE/share/Beanconqueror_1.png',
        });
        expect(
          await fileHelper.readFileAsBase64(result.path, Directory.Cache),
        ).toBe(BYTES_BASE64);
        expect(await namesIn('', Directory.Data)).toEqual([]);
      });
    }

    it('keeps each file until the share folder is cleared', async () => {
      setupAndroid();
      await fileHelper.writeFileForSharing(BYTES_BASE64, 'a.png');
      await fileHelper.writeFileForSharing(BYTES_BASE64, 'b.json');

      expect(await namesIn('share', Directory.Cache)).toEqual([
        'a.png',
        'b.json',
      ]);
    });

    it('clears only the share folder and leaves the rest of the cache', async () => {
      setupAndroid();
      const other = await fileHelper.createTempCacheDirectory('import');
      await Filesystem.writeFile({
        path: other.path + '/Beanconqueror.json',
        data: '{}',
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await fileHelper.writeFileForSharing(BYTES_BASE64, 'a.png');

      await fileHelper.clearShareDirectory();

      expect(await namesIn('', Directory.Cache)).toEqual([other.path]);
      expect(await namesIn(other.path, Directory.Cache)).toEqual([
        'Beanconqueror.json',
      ]);
    });

    it('does not fail when there is nothing to clear', async () => {
      setupAndroid();

      await expectAsync(fileHelper.clearShareDirectory()).toBeResolved();
      expect(uiLog.info).toHaveBeenCalled();
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
