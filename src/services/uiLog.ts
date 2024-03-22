/** Core */
import { Injectable } from '@angular/core';
import { LOGS_ENUM } from '../enums/logs/logs';
import { ILogInterface } from '../interfaces/log/iLog';
import moment from 'moment';
import { Brew } from '../classes/brew/brew';
import { Bean } from '../classes/bean/bean';

/** Third party */
declare var console;

@Injectable({
  providedIn: 'root',
})
export class UILog {
  private static instance: UILog;

  public disabled: boolean = true;
  private logs: Array<ILogInterface> = [];

  public static getInstance(): UILog {
    if (UILog.instance) {
      return UILog.instance;
    }
    // noinspection TsLint

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

  public getLogs(): Array<ILogInterface> {
    return this.logs;
  }

  public debug(_message): void {
    this.generateLogMessage(LOGS_ENUM.LOG, _message);
    if (!this.disabled) {
      console.log(_message);
    }
  }
  public log(_message: string): void {
    this.generateLogMessage(LOGS_ENUM.LOG, _message);
    if (!this.disabled) {
      console.log(_message);
    }
  }

  public info(_message: string): void {
    this.generateLogMessage(LOGS_ENUM.INFO, _message);
    if (this.disabled === false && console.info) {
      console.info(_message);
    }
  }

  public error(_message: string): void {
    this.generateLogMessage(LOGS_ENUM.ERR, _message);
    if (this.disabled === false && console.error) {
      console.error(_message);
    }
  }

  public unhandledError(_message: string) {
    this.generateLogMessage(LOGS_ENUM.ERR, _message);
  }

  public warn(_message: string): void {
    this.generateLogMessage(LOGS_ENUM.WARN, _message);
    if (this.disabled === false && console.warn) {
      console.warn(_message);
    }
  }

  private generateLogMessage(_type: LOGS_ENUM, _message: string) {
    if (this.logs.length > 3000) {
      // Make sure we don't exceed when something wents wrong inside the app.
      this.logs = [];
    }
    const logMessage: ILogInterface = {} as ILogInterface;
    logMessage.key = _type;
    logMessage.value = _message;
    logMessage.timestamp = moment().format('DD.MM.YYYY HH:mm:ss:SSS');
    this.logs.push(logMessage);
  }
}
