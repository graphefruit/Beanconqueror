import { Injectable } from '@angular/core';

import moment from 'moment';
import { stringify } from 'safe-stable-stringify';
import { serializeError } from 'serialize-error';

import { LogLevel } from '../enums/logs/log-level';
import { LogEntry } from '../interfaces/log/log-entry';

@Injectable({
  providedIn: 'root',
})
export class UILog {
  private static instance: UILog;

  public disabled = true;
  private logs: LogEntry[] = [];

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
    if (this.logs.length > 3000) {
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
  }
}
