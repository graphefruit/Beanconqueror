/** Core */
import {Injectable} from '@angular/core';
import {LOGS_ENUM} from '../enums/logs/logs';
import {ILogInterface} from '../interfaces/log/iLog';
import moment from 'moment';

/** Third party */
declare var console;


@Injectable({
  providedIn: 'root'
})
export class UILog {

  public disabled: boolean = true;
  private logs: Array<ILogInterface> = [];
  constructor() {
    this.disabled = false;
  }

  public enable(): void {
    this.disabled = false;
  }
  public disable(): void {
    this.disabled = false;
  }

  public getLogs(): Array<ILogInterface> {
    return this.logs;
  }

  public log(_message: string): void {
    if (!this.disabled) {
      this.generateLogMessage(LOGS_ENUM.LOG, _message);

      console.log(_message);
    }

  }

  public info(_message: string): void {
    if (!this.disabled && console.info) {
      this.generateLogMessage(LOGS_ENUM.INFO, _message);
      console.info(_message);
    }
  }

  public error(_message: string): void {
    if (!this.disabled && console.error) {
      this.generateLogMessage(LOGS_ENUM.ERR, _message);
      console.error(_message);
    }
  }

  public warn(_message: string): void {
    if (!this.disabled && console.warn) {
      this.generateLogMessage(LOGS_ENUM.WARN, _message);
      console.warn(_message);
    }
  }

  private generateLogMessage(_type: LOGS_ENUM, _message: string) {
    const logMessage: ILogInterface = {} as ILogInterface;
    logMessage.key = _type;
    logMessage.value = _message;
    logMessage.timestamp = moment().format('DD.MM.YYYY HH:mm:ss:SSS');
    this.logs.push(logMessage);
  }

}
