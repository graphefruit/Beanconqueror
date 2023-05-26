import { DEBUG } from './constants';
import { Observable, Subject } from 'rxjs';

export class Logger {
  private static logSubject = new Subject<{ type: string; log: string }>();
  private static __isLogEnabled: boolean = true;
  private prefix: string;

  constructor(prefix = 'DEFAULT') {
    this.prefix = prefix;
  }

  public static attachOnLog(): Observable<{ type: string; log: string }> {
    return this.logSubject.asObservable();
  }

  public static disableLog() {
    Logger.__isLogEnabled = false;
  }

  public static enableLog() {
    Logger.__isLogEnabled = true;
  }

  private static __sendLog(_type: string, _log: string) {
    this.logSubject.next({ type: _type, log: _log });
  }

  public log(...args: any) {
    if (this.isLogEnabled() || DEBUG) {
      Logger.__sendLog('LOG', `${this.prefix}: ${JSON.stringify(args)}`);
    }
  }

  public info(...args: any) {
    if (this.isLogEnabled() || DEBUG) {
      Logger.__sendLog('INFO', `${this.prefix}: ${JSON.stringify(args)}`);
    }
  }

  public error(...args: any) {
    if (this.isLogEnabled() || DEBUG) {
      Logger.__sendLog('ERROR', `${this.prefix}: ${JSON.stringify(args)}`);
    }
  }

  public debug(...args: any) {
    if (this.isLogEnabled() || DEBUG) {
      Logger.__sendLog('DEBUG', `${this.prefix}: ${JSON.stringify(args)}`);
    }
  }

  private isLogEnabled(): boolean {
    try {
      return Logger.__isLogEnabled;
    } catch (ex) {
      return false;
    }
  }
}
