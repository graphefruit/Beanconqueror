import { NgZone, provideZoneChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { FilesystemWeb } from '@capacitor/filesystem/dist/esm/web';

import { LogEntry } from '../../interfaces/log/log-entry';
import {
  canAppendToLogFile,
  LOG_FILE_MAX_BYTES,
  LOG_FILES_KEPT,
  logFileNames,
  UILog,
} from '../uiLog';

const DIRECTORY = Directory.LibraryNoCloud;

async function clearFiles(): Promise<void> {
  await (Filesystem as unknown as FilesystemWeb).clear();
}

async function logFiles(): Promise<string[]> {
  const { files } = await Filesystem.readdir({
    path: 'logs',
    directory: DIRECTORY,
  });
  return files.map((_file) => _file.name).sort();
}

async function readLog(_name: string): Promise<string> {
  const { data } = await Filesystem.readFile({
    path: `logs/${_name}`,
    directory: DIRECTORY,
    encoding: Encoding.UTF8,
  });
  return data as string;
}

async function writeLog(_name: string, _data: string): Promise<void> {
  await Filesystem.writeFile({
    path: `logs/${_name}`,
    data: _data,
    directory: DIRECTORY,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

function line(_message: string): string {
  return (
    JSON.stringify({
      level: 'LOG',
      message: _message,
      timestamp: '01.01.2026 10:00:00:000',
      params: [],
    }) + '\n'
  );
}

function today(): string {
  const now = new Date();
  return (
    `${now.getFullYear()}` +
    `${now.getMonth() + 1}`.padStart(2, '0') +
    `${now.getDate()}`.padStart(2, '0')
  );
}

/** The logs of a test, finished before the next test starts. */
const created: UILog[] = [];

/** A log that keeps the console of the test run clean. */
function quietLog(): UILog {
  const uiLog = TestBed.runInInjectionContext(() => new UILog());
  uiLog.disable();
  created.push(uiLog);
  return uiLog;
}

describe('UILog', () => {
  let native: jasmine.Spy;

  beforeEach(async () => {
    // As in the app: the log runs beside the change detection of zone.js.
    TestBed.configureTestingModule({
      providers: [provideZoneChangeDetection()],
    });
    await clearFiles();
    native = spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    // The interval of the file log runs on the mocked clock.
    jasmine.clock().install();
  });

  afterEach(async () => {
    // Nothing of a test may write into the files of the next one.
    jasmine.clock().uninstall();
    await App.removeAllListeners();
    await Promise.all(created.map((_uiLog) => _uiLog.writeToFile()));
    created.length = 0;
    await clearFiles();
  });

  describe('canAppendToLogFile', () => {
    const file = { name: 'log_20261125_101500000.jsonl', size: 100 };

    it('appends to a file of today that stays within its size', () => {
      expect(canAppendToLogFile(file, '20261125', 50)).toBeTrue();
    });

    it('starts a new file on a new day', () => {
      expect(canAppendToLogFile(file, '20261126', 50)).toBeFalse();
    });

    it('starts a new file once it would grow beyond its size', () => {
      expect(
        canAppendToLogFile(file, '20261125', LOG_FILE_MAX_BYTES - 100),
      ).toBeTrue();
      expect(
        canAppendToLogFile(file, '20261125', LOG_FILE_MAX_BYTES - 99),
      ).toBeFalse();
    });

    it('starts a new file when there is none', () => {
      expect(canAppendToLogFile(undefined, '20261125', 1)).toBeFalse();
    });
  });

  describe('logFileNames', () => {
    it('lists only log files, oldest first', () => {
      expect(
        logFileNames([
          'log_20261125_101500000.jsonl',
          'other.txt',
          'log_20261124_235959000.jsonl',
        ]),
      ).toEqual([
        'log_20261124_235959000.jsonl',
        'log_20261125_101500000.jsonl',
      ]);
    });
  });

  it('writes the entries to a file of today', async () => {
    const uiLog = quietLog();
    uiLog.log('Before the start');
    await uiLog.startFileLog();
    uiLog.error('After the start', new Error('broken'));

    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names.length).toBe(1);
    expect(names[0]).toMatch(new RegExp(`^log_${today()}_\\d{9}\\.jsonl$`));
    const lines = (await readLog(names[0])).trim().split('\n');
    expect(
      lines.map((_line) => (JSON.parse(_line) as LogEntry).message),
    ).toEqual(['Before the start', 'After the start']);
    expect(JSON.parse(lines[1]).params[0].message).toBe('broken');
  });

  it('writes every second without being asked', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    const write = spyOn(uiLog, 'writeToFile').and.callThrough();

    jasmine.clock().tick(999);
    expect(write).not.toHaveBeenCalled();
    jasmine.clock().tick(1);

    expect(write).toHaveBeenCalledTimes(1);
  });

  it('writes an error at once, without waiting for the interval', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    const write = spyOn(uiLog, 'writeToFile').and.callThrough();
    uiLog.log('Waits for the interval');
    expect(write).not.toHaveBeenCalled();

    uiLog.error('Broken');
    uiLog.unhandledError(new Error('Also broken'));

    expect(write).toHaveBeenCalledTimes(2);
    await write.calls.mostRecent().returnValue;
    const lines = (await readLog((await logFiles())[0])).trim().split('\n');
    expect(
      lines.map((_line) => (JSON.parse(_line) as LogEntry).message),
    ).toEqual(['Waits for the interval', 'Broken', 'Unhandled error caught']);
  });

  it('writes outside Angular, so it runs no change detection', async () => {
    const zone = TestBed.inject(NgZone);
    const uiLog = quietLog();
    const inAngular: boolean[] = [];
    // The mocked clock would run the interval in the zone of the test.
    jasmine.clock().uninstall();
    spyOn(window, 'setInterval').and.callFake((() => {
      inAngular.push(NgZone.isInAngularZone());
      return 0;
    }) as unknown as typeof setInterval);
    spyOn(FilesystemWeb.prototype, 'writeFile').and.callFake(async () => {
      inAngular.push(NgZone.isInAngularZone());
      return { uri: '' };
    });

    await zone.run(() => uiLog.startFileLog());
    uiLog.log('Entry');
    await zone.run(() => uiLog.writeToFile());

    expect(inAngular).toEqual([false, false]);
  });

  it('writes when the app goes into the background', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    // Resolves once the listeners of the log are attached.
    await App.addListener('pause', () => undefined);
    const write = spyOn(uiLog, 'writeToFile').and.callThrough();

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    try {
      document.dispatchEvent(new Event('visibilitychange'));
    } finally {
      delete (document as unknown as { hidden?: boolean }).hidden;
    }

    // Once for the pause, once for the inactive app.
    expect(write).toHaveBeenCalledTimes(2);
  });

  it('keeps no more unwritten entries than the log holds', async () => {
    const uiLog = quietLog();
    for (let i = 0; i < 3002; i++) {
      uiLog.log(`Entry ${i}`);
    }
    await uiLog.startFileLog();

    await uiLog.writeToFile();

    const lines = (await readLog((await logFiles())[0])).trim().split('\n');
    expect(lines.length).toBe(3000);
    expect((JSON.parse(lines[0]) as LogEntry).message).toBe('Entry 2');
  });

  it('appends later entries to the same file', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('First');
    await uiLog.writeToFile();
    uiLog.log('Second');
    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names.length).toBe(1);
    const lines = (await readLog(names[0])).trim().split('\n');
    expect(
      lines.map((_line) => (JSON.parse(_line) as LogEntry).message),
    ).toEqual(['First', 'Second']);
  });

  it('reads no earlier session at the start', async () => {
    await writeLog('log_20261124_080000000.jsonl', line('Yesterday'));
    const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();
    const uiLog = quietLog();

    await uiLog.startFileLog();

    expect(read).not.toHaveBeenCalled();
    expect(uiLog.getLogs()).toEqual([]);
  });

  it('shows the entries of earlier sessions before the new ones', async () => {
    await writeLog('log_20261123_080000000.jsonl', line('Two days ago'));
    await writeLog(
      'log_20261124_080000000.jsonl',
      line('Yesterday') + '{"level":"LOG","mess',
    );
    const uiLog = quietLog();
    uiLog.log('Now');
    await uiLog.startFileLog();

    await uiLog.loadEarlier();

    expect(uiLog.getLogs().map((_entry) => _entry.message)).toEqual([
      'Two days ago',
      'Yesterday',
      'Now',
    ]);
    expect(uiLog.getLogs()[0].timestamp).toBe('01.01.2026 10:00:00:000');
  });

  it('reads no more earlier entries than the log holds', async () => {
    await writeLog('log_20261123_080000000.jsonl', line('Too old'));
    await writeLog(
      'log_20261124_080000000.jsonl',
      Array.from({ length: 3000 }, (_v, _i) => line(`Entry ${_i}`)).join(''),
    );
    const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();
    const uiLog = quietLog();
    uiLog.log('Now');
    await uiLog.startFileLog();

    await uiLog.loadEarlier();

    const messages = uiLog.getLogs().map((_entry) => _entry.message);
    expect(messages.length).toBe(3000);
    expect(messages[0]).toBe('Entry 1');
    expect(messages.at(-1)).toBe('Now');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads the earlier sessions only once', async () => {
    await writeLog('log_20261124_080000000.jsonl', line('Yesterday'));
    const uiLog = quietLog();
    await uiLog.startFileLog();
    await uiLog.loadEarlier();
    const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();

    await uiLog.loadEarlier();

    expect(read).not.toHaveBeenCalled();
    expect(uiLog.getLogs().map((_entry) => _entry.message)).toEqual([
      'Yesterday',
    ]);
  });

  it('does not show the entries of this session twice', async () => {
    await writeLog(`log_${today()}_080000000.jsonl`, line('This morning'));
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('Now');
    await uiLog.writeToFile();

    await uiLog.loadEarlier();

    expect(uiLog.getLogs().map((_entry) => _entry.message)).toEqual([
      'This morning',
      'Now',
    ]);
  });

  it('reads no earlier sessions in the browser', async () => {
    native.and.returnValue(false);
    const uiLog = quietLog();
    await uiLog.startFileLog();
    const read = spyOn(FilesystemWeb.prototype, 'readFile').and.callThrough();

    await uiLog.loadEarlier();

    expect(read).not.toHaveBeenCalled();
  });

  it('leaves the native log files to the native log', async () => {
    await writeLog('native_20261120_080000000.log', 'native\n');
    await writeLog('log_20261121_080000000.jsonl', line('Four days ago'));
    await writeLog('log_20261122_080000000.jsonl', line('Three days ago'));
    await writeLog('log_20261123_080000000.jsonl', line('Two days ago'));
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('Today');

    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names).toContain('native_20261120_080000000.log');
    expect(names).not.toContain('log_20261121_080000000.jsonl');
  });

  it('starts a new file on a new day and deletes the oldest', async () => {
    await writeLog('log_20261121_080000000.jsonl', line('Four days ago'));
    await writeLog('log_20261122_080000000.jsonl', line('Three days ago'));
    await writeLog('log_20261123_080000000.jsonl', line('Two days ago'));
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('Today');

    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names.length).toBe(LOG_FILES_KEPT);
    expect(names.slice(0, 2)).toEqual([
      'log_20261122_080000000.jsonl',
      'log_20261123_080000000.jsonl',
    ]);
    expect(names[2]).toMatch(new RegExp(`^log_${today()}_`));
  });

  it('starts a new file once the file of today is full', async () => {
    const full = `log_${today()}_000000000.jsonl`;
    await writeLog(full, 'x'.repeat(LOG_FILE_MAX_BYTES - 10) + '\n');
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('Does not fit anymore');

    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names.length).toBe(2);
    expect(names[0]).toBe(full);
    expect(await readLog(names[1])).toContain('Does not fit anymore');
  });

  it('drops entries it cannot write without logging and goes on', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    const write = spyOn(FilesystemWeb.prototype, 'writeFile').and.rejectWith(
      new Error('disk full'),
    );
    uiLog.log('Lost');

    await expectAsync(uiLog.writeToFile()).toBeResolved();

    expect(uiLog.getLogs().map((_entry) => _entry.message)).toEqual(['Lost']);
    write.and.callThrough();
    uiLog.log('Written');
    await uiLog.writeToFile();
    const content = await readLog((await logFiles())[0]);
    expect(content).toContain('Written');
    expect(content).not.toContain('Lost');
  });

  it('starts a new file when the current one cannot be appended to', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    uiLog.log('First');
    await uiLog.writeToFile();
    spyOn(FilesystemWeb.prototype, 'appendFile').and.rejectWith(
      new Error('gone'),
    );
    uiLog.log('Lost');
    await uiLog.writeToFile();
    uiLog.log('In a new file');

    await uiLog.writeToFile();

    const names = await logFiles();
    expect(names.length).toBe(2);
    expect(await readLog(names[1])).toContain('In a new file');
  });

  it('writes no file in the browser', async () => {
    native.and.returnValue(false);
    const uiLog = quietLog();
    uiLog.log('Only in memory');
    const readdir = spyOn(FilesystemWeb.prototype, 'readdir').and.callThrough();
    const write = spyOn(FilesystemWeb.prototype, 'writeFile').and.callThrough();

    await uiLog.startFileLog();
    uiLog.log('Still only in memory');
    jasmine.clock().tick(5000);
    await uiLog.writeToFile();

    expect(readdir).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(uiLog.getLogs().length).toBe(2);
  });

  it('starts the file log only once', async () => {
    const uiLog = quietLog();
    await uiLog.startFileLog();
    const readdir = spyOn(FilesystemWeb.prototype, 'readdir').and.callThrough();

    await uiLog.startFileLog();

    expect(readdir).not.toHaveBeenCalled();
  });
});
