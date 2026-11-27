import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';

import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';
import { AttachmentExportService } from './attachment-export.service';
import { AttachmentManifestService } from './attachment-manifest.service';

const DIR = 'export';
const STAGING = `${DIR}/${AttachmentExportService.STAGING_FOLDER}`;
const ZIP = AttachmentExportService.ZIP_NAME;
const FILES = [
  'a.jpg',
  'b.jpg',
  'brews/brew-1_flow_profile.json',
  'c.jpg',
  'graphs/graph-1_flow_profile.json',
];

type FsMethod = 'copy' | 'mkdir' | 'rename' | 'writeFile';

function original(_name: FsMethod) {
  const method = Object.getOwnPropertyDescriptor(FilesystemWeb.prototype, _name)
    .value as (this: FilesystemWeb, _options: unknown) => Promise<never>;
  return (_self: FilesystemWeb, _options: unknown) =>
    method.call(_self, _options) as Promise<never>;
}

// Taken before any test replaces them with spies.
const realCopy = original('copy');
const realMkdir = original('mkdir');
const realRename = original('rename');
const realWriteFile = original('writeFile');

async function write(_path: string, _text: string, _directory: Directory) {
  await Filesystem.writeFile({
    path: _path,
    directory: _directory,
    data: _text,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

async function read(_path: string): Promise<string | undefined> {
  try {
    const { data } = await Filesystem.readFile({
      path: _path,
      directory: Directory.External,
      encoding: Encoding.UTF8,
    });
    return data as string;
  } catch {
    return undefined;
  }
}

/** Every file below the folder of the export, with its path from there. */
async function exported(): Promise<string[]> {
  const found: string[] = [];
  const walk = async (_folder: string) => {
    let entries: { name: string; type: string }[];
    try {
      entries = (
        await Filesystem.readdir({
          path: _folder,
          directory: Directory.External,
        })
      ).files;
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = `${_folder}/${entry.name}`;
      if (entry.type === 'directory') {
        await walk(path);
      } else {
        found.push(path.substring(DIR.length + 1));
      }
    }
  };
  await walk(DIR);
  return found.sort();
}

describe('AttachmentExportService', () => {
  let service: AttachmentExportService;
  let paths: string[];
  let log: jasmine.SpyObj<UILog>;
  let copy: jasmine.Spy;

  const zip = () => new Blob(['the zip']);
  const folder = { path: DIR, directory: Directory.External };

  beforeEach(async () => {
    await (Filesystem as unknown as FilesystemWeb).clear();
    paths = [...FILES];
    for (const file of FILES) {
      await write(file, `content of ${file}`, Directory.Data);
    }
    log = jasmine.createSpyObj('UILog', ['log', 'info', 'error', 'debug']);
    const platform = {
      is: (_name: string) => ['capacitor', 'android'].includes(_name),
      platforms: () => ['capacitor', 'android'],
    };
    TestBed.configureTestingModule({
      providers: [
        UIFileHelper,
        { provide: UILog, useValue: log },
        { provide: Platform, useValue: platform },
        {
          provide: AttachmentManifestService,
          useValue: { currentPaths: () => Promise.resolve(paths) },
        },
      ],
    });
    service = TestBed.inject(AttachmentExportService);
    // A folder that is there already: the device answers with this code,
    // which the file helper ignores; the browser build has no codes.
    spyOn(FilesystemWeb.prototype, 'mkdir').and.callFake(function (
      this: FilesystemWeb,
      _options,
    ) {
      return realMkdir(this, _options).catch((_error: Error) => {
        throw _error.message.includes('already exist')
          ? Object.assign(_error, { code: 'OS-PLUG-FILE-0010' })
          : _error;
      });
    });
    copy = spyOn(FilesystemWeb.prototype, 'copy').and.callFake(function (
      this: FilesystemWeb,
      _options,
    ) {
      return realCopy(this, _options);
    });
  });

  afterEach(async () => {
    await (Filesystem as unknown as FilesystemWeb).clear();
  });

  const copiedFrom = () =>
    copy.calls.allArgs().map((_args) => (_args[0] as { from: string }).from);

  it('copies every file and the zip into the folder and leaves no staging folder', async () => {
    const result = await service.writeExport(folder, zip());

    expect(result).toEqual({ missing: 0, aborted: false });
    expect(await exported()).toEqual([...FILES, ZIP].sort());
    for (const file of FILES) {
      expect(await read(`${DIR}/${file}`)).toBe(`content of ${file}`);
    }
    expect(atob(await read(`${DIR}/${ZIP}`))).toBe('the zip');
    expect(log.error.calls.count()).toBe(0);
  });

  it('copies in portions, a large number of files', async () => {
    paths = Array.from({ length: 60 }, (_, i) => `many/${i}.jpg`);
    for (const path of paths) {
      await write(path, path, Directory.Data);
    }

    const result = await service.writeExport(folder, zip());

    expect(result.missing).toBe(0);
    expect((await exported()).length).toBe(61);
  });

  it('counts the files it cannot find, logs them and goes on', async () => {
    await Filesystem.deleteFile({ path: 'b.jpg', directory: Directory.Data });

    const result = await service.writeExport(folder, zip());

    expect(result).toEqual({ missing: 1, aborted: false });
    expect(await exported()).toEqual(
      [...FILES, ZIP].filter((_f) => _f !== 'b.jpg').sort(),
    );
    expect(log.error.calls.allArgs().map((_a) => _a[1])).toEqual(['b.jpg']);
  });

  it('replaces the files of an earlier export only when the new one is complete', async () => {
    await write(`${DIR}/a.jpg`, 'old', Directory.External);
    await write(`${DIR}/${ZIP}`, 'old zip', Directory.External);
    await write(`${DIR}/unrelated.txt`, 'kept', Directory.External);

    await service.writeExport(folder, zip());

    expect(await read(`${DIR}/a.jpg`)).toBe('content of a.jpg');
    expect(atob(await read(`${DIR}/${ZIP}`))).toBe('the zip');
    expect(await read(`${DIR}/unrelated.txt`)).toBe('kept');
  });

  it('leaves the folder as it was and no files behind when the zip cannot be written', async () => {
    await write(`${DIR}/a.jpg`, 'old', Directory.External);
    spyOn(FilesystemWeb.prototype, 'writeFile').and.callFake(function (
      this: FilesystemWeb,
      _options,
    ) {
      return (_options as { path: string }).path.endsWith('.zip')
        ? Promise.reject(new Error('disk full'))
        : realWriteFile(this, _options);
    });

    await expectAsync(service.writeExport(folder, zip())).toBeRejectedWithError(
      'disk full',
    );

    expect(await exported()).toEqual(['a.jpg']);
    expect(await read(`${DIR}/a.jpg`)).toBe('old');
  });

  it('removes the staging folder when the list of files cannot be read', async () => {
    await write(`${STAGING}/a.jpg`, 'from before', Directory.External);
    const manifest = TestBed.inject(AttachmentManifestService);
    spyOn(manifest, 'currentPaths').and.rejectWith(new Error('broken'));

    await expectAsync(service.writeExport(folder, zip())).toBeRejectedWithError(
      'broken',
    );

    expect(await exported()).toEqual([]);
  });

  it('stops when asked, without touching the folder, and keeps what it copied', async () => {
    await write(`${DIR}/a.jpg`, 'old', Directory.External);
    const controller = new AbortController();
    copy.and.callFake(async function (this: FilesystemWeb, _options) {
      const done = await realCopy(this, _options);
      if (copy.calls.count() === 2) {
        controller.abort();
      }
      return done;
    });

    const result = await service.writeExport(folder, zip(), controller.signal);

    expect(result).toEqual({ missing: 0, aborted: true });
    expect(await exported()).toEqual(
      [
        'a.jpg',
        `${AttachmentExportService.STAGING_FOLDER}/a.jpg`,
        `${AttachmentExportService.STAGING_FOLDER}/b.jpg`,
      ].sort(),
    );
    expect(await read(`${DIR}/a.jpg`)).toBe('old');
  });

  it('goes on after the last copied file when it was stopped, without copying a complete file again', async () => {
    const controller = new AbortController();
    copy.and.callFake(async function (this: FilesystemWeb, _options) {
      const done = await realCopy(this, _options);
      if (copy.calls.count() === 2) {
        controller.abort();
      }
      return done;
    });
    await service.writeExport(folder, zip(), controller.signal);
    // A complete file of the staging folder is kept as it is.
    await write(`${STAGING}/b.jpg`, 'copied before', Directory.External);
    copy.calls.reset();
    copy.and.callFake(function (this: FilesystemWeb, _options) {
      return realCopy(this, _options);
    });

    const result = await service.writeExport(folder, zip());

    expect(result).toEqual({ missing: 0, aborted: false });
    expect(copiedFrom()).toEqual(FILES.slice(2));
    expect(await exported()).toEqual([...FILES, ZIP].sort());
    expect(await read(`${DIR}/b.jpg`)).toBe('copied before');
  });

  it('copies a file again that the app was ended in, and only that one', async () => {
    // As left behind when the app ended while copying c.jpg.
    await write(`${STAGING}/a.jpg`, 'content of a.jpg', Directory.External);
    await write(`${STAGING}/b.jpg`, 'content of b.jpg', Directory.External);
    await write(`${STAGING}/c.jpg.part`, 'cont', Directory.External);

    const result = await service.writeExport(folder, zip());

    expect(result).toEqual({ missing: 0, aborted: false });
    expect(copiedFrom()).toEqual([
      'brews/brew-1_flow_profile.json',
      'c.jpg',
      'graphs/graph-1_flow_profile.json',
    ]);
    expect(await exported()).toEqual([...FILES, ZIP].sort());
    expect(await read(`${DIR}/c.jpg`)).toBe('content of c.jpg');
  });

  it('does not leave a part file of a copy that failed', async () => {
    copy.and.callFake(async function (this: FilesystemWeb, _options) {
      await realCopy(this, _options);
      if ((_options as { from: string }).from === 'b.jpg') {
        throw new Error('copy broke off');
      }
      return { uri: '' };
    });

    const result = await service.writeExport(folder, zip());

    expect(result.missing).toBe(1);
    expect(await exported()).toEqual(
      [...FILES, ZIP].filter((_f) => _f !== 'b.jpg').sort(),
    );
  });

  it('keeps the complete staging folder when moving fails, and the next export finishes', async () => {
    let failOnce = true;
    spyOn(FilesystemWeb.prototype, 'rename').and.callFake(function (
      this: FilesystemWeb,
      _options,
    ) {
      const to = (_options as { to: string }).to;
      if (failOnce && to === `${DIR}/c.jpg`) {
        failOnce = false;
        return Promise.reject(new Error('no space'));
      }
      return realRename(this, _options);
    });

    await expectAsync(service.writeExport(folder, zip())).toBeRejectedWithError(
      'no space',
    );
    expect(await read(`${STAGING}/c.jpg`)).toBe('content of c.jpg');
    expect(await read(`${DIR}/${ZIP}`)).toBeUndefined();
    copy.calls.reset();

    await service.writeExport(folder, zip());

    expect(await exported()).toEqual([...FILES, ZIP].sort());
    expect(copiedFrom()).toEqual([
      'a.jpg',
      'b.jpg',
      'brews/brew-1_flow_profile.json',
    ]);
  });

  it('logs and goes on when the staging folder cannot be removed', async () => {
    spyOn(FilesystemWeb.prototype, 'rmdir').and.rejectWith(new Error('busy'));

    const result = await service.writeExport(folder, zip());

    expect(result).toEqual({ missing: 0, aborted: false });
    expect(log.error.calls.allArgs()).toEqual([
      ['Could not remove the staging folder', jasmine.any(Error)],
    ]);
  });
});
