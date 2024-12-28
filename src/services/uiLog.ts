/** Core */
import { Injectable } from '@angular/core';
import { LOGS_ENUM } from '../enums/logs/logs';
import { ILogInterface } from '../interfaces/log/iLog';
import moment from 'moment';

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

  public debug(_message, ...optionalParams: any[]): void {
    this.generateLogMessage(LOGS_ENUM.LOG, _message, optionalParams);
    if (!this.disabled) {
      console.log(_message, ...optionalParams);
    }
  }
  public log(_message: string, ...optionalParams: any[]): void {
    this.generateLogMessage(LOGS_ENUM.LOG, _message, optionalParams);
    if (!this.disabled) {
      console.log(_message, ...optionalParams);
    }
  }

  public info(_message: string, ...optionalParams: any[]): void {
    this.generateLogMessage(LOGS_ENUM.INFO, _message, optionalParams);
    if (this.disabled === false && console.info) {
      console.info(_message, ...optionalParams);
    }
  }

  public error(_message: string, ...optionalParams: any[]): void {
    this.generateLogMessage(LOGS_ENUM.ERR, _message, optionalParams);
    if (this.disabled === false && console.error) {
      console.error(_message, ...optionalParams);
    }
  }

  public unhandledError(_message: string) {
    this.generateLogMessage(LOGS_ENUM.ERR, _message);
  }

  public warn(_message: string, ...optionalParams: any[]): void {
    this.generateLogMessage(LOGS_ENUM.WARN, _message, optionalParams);
    if (this.disabled === false && console.warn) {
      console.warn(_message, ...optionalParams);
    }
  }

  private generateLogMessage(
    _type: LOGS_ENUM,
    _message: string,
    ...optionalParams: any[]
  ) {
    if (this.logs.length > 3000) {
      // Make sure we don't exceed when something wents wrong inside the app.
      this.logs = [];
    }

    let formattedMessage = _message;
    if (optionalParams.length > 0) {
      formattedMessage += ` [${optionalParams.join(', ')}]`;
    }

    const logMessage: ILogInterface = {} as ILogInterface;
    logMessage.key = _type;
    logMessage.value = formattedMessage;
    logMessage.timestamp = moment().format('DD.MM.YYYY HH:mm:ss:SSS');
    this.logs.push(logMessage);
  }

  public generateExceptionLineMessage(_message: string) {
    try {
      this.debug(_message + ' - Stacktrace: ' + new Error().stack.toString());
    } catch (ex) {}
  }
}
