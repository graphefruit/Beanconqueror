import { inject, NgZone, Service } from '@angular/core';

import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import moment from 'moment';
import { stringify } from 'safe-stable-stringify';
import { serializeError } from 'serialize-error';

import { LogLevel } from '../enums/logs/log-level';
import { LogEntry } from '../interfaces/log/log-entry';

const MAX_ENTRIES = 3000;
/** Not synced to iCloud and not shown in the Files app. */
export const LOG_DIRECTORY = Directory.LibraryNoCloud;
export const LOG_FOLDER = 'logs';
export const LOG_FILE_NAME = /^log_(\d{8})_\d{9}\.jsonl$/;
export const LOG_FILE_MAX_BYTES = 1024 * 1024;
export const LOG_FILES_KEPT = 3;
const WRITE_INTERVAL_MS = 1000;

export interface LogFile {
  name: string;
  size: number;
}

/**
 * Whether lines of `_bytes` still go into `_file`: a file holds the lines of
 * one day only, up to LOG_FILE_MAX_BYTES.
 */
export function canAppendToLogFile(
  _file: LogFile | undefined,
  _today: string,
  _bytes: number,
): _file is LogFile {
  return (
    _file !== undefined &&
    LOG_FILE_NAME.exec(_file.name)?.[1] === _today &&
    _file.size + _bytes <= LOG_FILE_MAX_BYTES
  );
}

/** The log files of a folder, oldest first. */
export function logFileNames(_names: string[]): string[] {
  return _names.filter((_name) => LOG_FILE_NAME.test(_name)).sort();
}

@Service()
export class UILog {
  private static instance: UILog;

  public disabled = true;
  private logs: LogEntry[] = [];
  /** Until startFileLog() decided whether a file is written. */
  private fileLog: 'waiting' | 'on' | 'off' = 'waiting';
  private unwritten: LogEntry[] = [];
  private currentFile: LogFile | undefined;
  /** The log files as the session found them, read by loadEarlier(). */
  private earlierFiles: LogFile[] = [];
  private earlierLoaded = false;
  private writing: Promise<void> = Promise.resolve();
  private readonly ngZone = inject(NgZone);

  public static getInstance(): UILog {
    if (UILog.instance) {
      return UILog.instance;
    }

    return undefined;
  }
  constructor() {
    this.disabled = false;

    if (UILog.instance === undefined) {
      UILog.instance = this;
    }
  }

  public enable(): void {
    this.disabled = false;
  }
  public disable(): void {
    this.disabled = true;
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  /**
   * Keeps writing the log to files from now on. Only in the app: the browser
   * has no app folder. Earlier sessions are read only by loadEarlier(), so the
   * start reads no file.
   */
  public async startFileLog(): Promise<void> {
    if (this.fileLog !== 'waiting') {
      return;
    }
    if (!Capacitor.isNativePlatform()) {
      this.fileLog = 'off';
      this.unwritten = [];
      return;
    }
    try {
      const { files } = await Filesystem.readdir({
        path: LOG_FOLDER,
        directory: LOG_DIRECTORY,
      });
      const names = logFileNames(files.map((_file) => _file.name));
      this.earlierFiles = names.map((_name) => {
        const { size } = files.find((_file) => _file.name === _name);
        return { name: _name, size };
      });
      const newest = this.earlierFiles.at(-1);
      if (newest) {
        this.currentFile = { ...newest };
      }
    } catch {
      // No log written yet; the first write creates the folder.
    }
    this.fileLog = 'on';
    // Outside Angular: neither the interval nor the writes may run change
    // detection of the whole app every few seconds.
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => void this.writeToFile(), WRITE_INTERVAL_MS);
      // The interval may never fire once the app is in the background, and
      // iOS tells of the pause too late when the app is closed from the switcher.
      void App.addListener('pause', () => void this.writeToFile());
      void App.addListener('appStateChange', (_state) => {
        if (!_state.isActive) {
          void this.writeToFile();
        }
      });
    });
  }

  /** Writes the entries logged since the last write, one after another. */
  public writeToFile(): Promise<void> {
    this.writing = this.ngZone.runOutsideAngular(() =>
      this.writing.then(() => this.writeUnwritten()),
    );
    return this.writing;
  }

  /** Puts the entries of earlier sessions before the new ones, once. */
  public async loadEarlier(): Promise<void> {
    if (this.fileLog !== 'on' || this.earlierLoaded) {
      return;
    }
    this.earlierLoaded = true;
    const room = MAX_ENTRIES - this.logs.length;
    let earlier: LogEntry[] = [];
    for (const file of [...this.earlierFiles].reverse()) {
      if (earlier.length >= room) {
        break;
      }
      try {
        const { data } = await Filesystem.readFile({
          path: `${LOG_FOLDER}/${file.name}`,
          directory: LOG_DIRECTORY,
          encoding: Encoding.UTF8,
        });
        // This session may have appended to the file; those entries are
        // already in the log.
        const before = new TextDecoder().decode(
          new TextEncoder().encode(data as string).slice(0, file.size),
        );
        earlier = [...parseLogLines(before), ...earlier];
      } catch {
        // An unreadable file only leaves out its entries.
      }
    }
    if (room > 0 && earlier.length > 0) {
      this.logs.unshift(...earlier.slice(-room));
    }
  }

  // Nothing here may log: every entry would be written again.
  private async writeUnwritten(): Promise<void> {
    if (this.fileLog !== 'on' || this.unwritten.length === 0) {
      return;
    }
    const lines = this.unwritten.map((_entry) => stringify(_entry) + '\n');
    this.unwritten = [];
    const data = lines.join('');
    const bytes = new TextEncoder().encode(data).length;
    const now = moment();
    try {
      if (canAppendToLogFile(this.currentFile, now.format('YYYYMMDD'), bytes)) {
        await Filesystem.appendFile({
          path: `${LOG_FOLDER}/${this.currentFile.name}`,
          data,
          directory: LOG_DIRECTORY,
          encoding: Encoding.UTF8,
        });
        this.currentFile.size += bytes;
        return;
      }
      // Down to the millisecond, so a new file never replaces the last one.
      const name = `log_${now.format('YYYYMMDD_HHmmssSSS')}.jsonl`;
      await Filesystem.writeFile({
        path: `${LOG_FOLDER}/${name}`,
        data,
        directory: LOG_DIRECTORY,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      this.currentFile = { name, size: bytes };
      await this.deleteOldestFiles();
    } catch {
      // The next write starts a new file in case this one is gone.
      this.currentFile = undefined;
    }
  }

  private async deleteOldestFiles(): Promise<void> {
    const { files } = await Filesystem.readdir({
      path: LOG_FOLDER,
      directory: LOG_DIRECTORY,
    });
    const names = logFileNames(files.map((_file) => _file.name));
    for (const name of names.slice(0, -LOG_FILES_KEPT)) {
      await Filesystem.deleteFile({
        path: `${LOG_FOLDER}/${name}`,
        directory: LOG_DIRECTORY,
      });
    }
  }

  public debug(_message: string, ...optionalParams: unknown[]): void {
    this.generateLogMessage(LogLevel.LOG, _message, ...optionalParams);
    if (!this.disabled) {
      console.log(_message, ...optionalParams);
    }
  }
  public log(_message: string, ...optionalParams: unknown[]): void {
    this.generateLogMessage(LogLevel.LOG, _message, ...optionalParams);
    if (!this.disabled) {
      console.log(_message, ...optionalParams);
    }
  }

  public info(_message: string, ...optionalParams: unknown[]): void {
    this.generateLogMessage(LogLevel.INFO, _message, ...optionalParams);
    if (this.disabled === false && console.info) {
      console.info(_message, ...optionalParams);
    }
  }

  public error(_message: string, ...optionalParams: unknown[]): void {
    this.generateLogMessage(LogLevel.ERR, _message, ...optionalParams);
    if (this.disabled === false && console.error) {
      console.error(_message, ...optionalParams);
    }
  }

  public unhandledError(error: unknown) {
    let errorToLog = error;
    if (errorToLog instanceof Error) {
      errorToLog = serializeError(errorToLog);
    }

    this.generateLogMessage(LogLevel.ERR, 'Unhandled error caught', error);
  }

  public warn(_message: string, ...optionalParams: unknown[]): void {
    this.generateLogMessage(LogLevel.WARN, _message, ...optionalParams);
    if (this.disabled === false && console.warn) {
      console.warn(_message, ...optionalParams);
    }
  }

  private generateLogMessage(
    _level: LogLevel,
    _message: string,
    ...optionalParams: unknown[]
  ) {
    if (this.logs.length > MAX_ENTRIES) {
      // Make sure we don't exceed when something wents wrong inside the app
      // by removing the first entry before adding a new one.
      this.logs.shift();
    }

    const serializableParams = optionalParams
      // Error stringifies to {}, make sure we retain all error details
      .map((p) => (p instanceof Error ? serializeError(p) : p));

    const logMessage = {
      level: _level,
      message: _message,
      timestamp: moment().format('DD.MM.YYYY HH:mm:ss:SSS'),
      params: serializableParams,
    };
    this.logs.push(logMessage);
    if (this.fileLog !== 'off') {
      this.unwritten.push(logMessage);
      if (this.unwritten.length > MAX_ENTRIES) {
        this.unwritten.shift();
      }
      // An error is often the last thing before a crash.
      if (_level === LogLevel.ERR && this.fileLog === 'on') {
        void this.writeToFile();
      }
    }
  }
}

/** The entries of a log file; a line cut off by a crash is left out. */
function parseLogLines(_data: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const line of _data.split('\n')) {
    try {
      const entry = JSON.parse(line) as LogEntry;
      if (entry && typeof entry.message === 'string') {
        entries.push(entry);
      }
    } catch {
      // Cut off or empty.
    }
  }
  return entries;
}
