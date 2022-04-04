import { UILog } from 'src/services/uiLog';
import { UISettingsStorage } from 'src/services/uiSettingsStorage';
import { DEBUG } from './constants';

export class Logger {
    private uiLog: UILog;
    private uiSettingsStorage: UISettingsStorage;
  
    private prefix: string;
  
    constructor(prefix = 'DEFAULT') {
      this.uiLog = UILog.getInstance();
      this.uiSettingsStorage = UISettingsStorage.getInstance();
      this.prefix = prefix;
    }
  
    private isLogEnabled(): boolean {
      try {
        return this.uiSettingsStorage.getSettings().scale_log;
      }catch(ex){
        return false;
      }
  
    }
  
    public log(...args) {
      if (this.isLogEnabled() || DEBUG) {
        return this.uiLog.log(`${this.prefix}: ${JSON.stringify(args)}`);
      }
  
    }
  
    public info(...args) {
      return this.uiLog.info(`${this.prefix} INFO: ${JSON.stringify(args)}`);
    }
  
    public error(...args) {
      return this.uiLog.error(`${this.prefix} ERROR: ${JSON.stringify(args)}`);
    }
  
    public debug(...args) {
      if (this.isLogEnabled() || DEBUG) {
        return this.uiLog.log(`${this.prefix} DEBUG: ${JSON.stringify(args)}`);
      }
    }
  }
