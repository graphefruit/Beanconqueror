import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular/standalone';

import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';

describe('UIFileHelper.statInternalFile', () => {
  const FILE_NAME = 'statInternalFile-test.zip';
  let fileHelper: UIFileHelper;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UIFileHelper,
        // Android: the app data directory is Directory.Data.
        {
          provide: Platform,
          useValue: {
            is: (_name: string) => ['capacitor', 'android'].includes(_name),
          },
        },
        { provide: UILog, useValue: { log: () => undefined } },
      ],
    });
    fileHelper = TestBed.inject(UIFileHelper);
  });

  afterEach(async () => {
    try {
      await Filesystem.deleteFile({
        path: FILE_NAME,
        directory: Directory.Data,
      });
    } catch {
      // Never written.
    }
  });

  it('gives the file in the app data directory', async () => {
    await Filesystem.writeFile({
      path: FILE_NAME,
      data: 'zip',
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });

    const file = await fileHelper.statInternalFile('/' + FILE_NAME);

    expect(file?.type).toBe('file');
    expect(file?.size).toBe(3);
  });

  it('gives nothing when there is no such file', async () => {
    expect(await fileHelper.statInternalFile(FILE_NAME)).toBeUndefined();
  });
});
