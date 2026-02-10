import { inject, Injectable } from '@angular/core';

import { Storage } from '@ionic/storage';

import { AppEvent } from '../classes/appEvent/appEvent';
import { AppEventType } from '../enums/appEvent/appEvent';
import { EventQueueService } from './queueService/queue-service.service';
import { UIAlert } from './uiAlert';
import { UILog } from './uiLog';

@Injectable({
  providedIn: 'root',
})
export class UIStorage {
  private readonly storage = inject(Storage);
  private eventQueue = inject(EventQueueService);
  private readonly uiLog = inject(UILog);
  private readonly uiAlert = inject(UIAlert);

  private _storage: Storage | null = null;

  public async init() {
    // If using, define drivers here: await this.storage.defineDriver(/*...*/);
    this._storage = await this.storage.create();
  }

  public getStorage() {
    return this._storage;
  }

  private async reinitializeStorage() {
    try {
      this.uiLog.log('UIStorage - ReinitializeStorage - Start');
      await this.init();
      this.uiLog.log('UIStorage - ReinitializeStorage - Ended successfully');
    } catch (ex) {
      this.uiLog.error('UIStorage - ReinitializeStorage - Issue occured', ex);
    }
  }

  public async set(_key: string, _val: any): Promise<boolean> {
    let whileCounter = 0;
    while (true) {
      try {
        this.uiLog.log(
          'UIStorage - Set Key - ' + _key + ' start counter:' + whileCounter,
        );
        await this.internalSet(_key, _val);
        this.uiLog.log('UIStorage - Set Key - ' + _key + ' successfully');
        return true;
      } catch (ex) {
        // We could not access the database... do it again.
        this.uiLog.error(
          'UIStorage - Set Key - ' + _key + ' exception ' + JSON.stringify(ex),
        );
        await new Promise((_internalResolve) => {
          setTimeout(() => {
            _internalResolve(undefined);
          }, 100);
        });
        whileCounter++;
        if (whileCounter === 11) {
          this.uiLog.error(
            'UIStorage - Set Key - ' +
              _key +
              ' we try to reconnect to the database and hopefully fix all issues',
          );
          await this.reinitializeStorage();
        } else if (whileCounter >= 20) {
          this.uiLog.error(
            'UIStorage - Set Key - ' +
              _key +
              ' we stop to try getting data now 20 attempts are enough - show error',
          );
          await this.uiAlert.showIOSIndexedDBIssues(
            'IOS_DATABASE_ISSUE_DESCRIPTION',
            'IOS_DATABASE_ISSUE_TITLE',
            true,
          );
          throw ex;
        }
      }
    }
  }

  private async internalSet(_key: string, _val: any): Promise<boolean> {
    await this._storage.set(_key, _val);
    // We just trigger storage change when the set was successfully.
    this.eventQueue.dispatch(
      new AppEvent(AppEventType.STORAGE_CHANGED, undefined),
    );
    return true;
  }

  private async internalGet(_key: string): Promise<any> {
    // We didn't wait here, maybe this will fix some issues :O?
    const data = await this._storage.get(_key);
    return data;
  }

  public async get(_key: string): Promise<any> {
    let whileCounter = 0;
    while (true) {
      try {
        this.uiLog.log(
          'UIStorage - Get Key - ' + _key + ' start counter:' + whileCounter,
        );
        const data = await this.internalGet(_key);
        this.uiLog.log('UIStorage - Get Key - ' + _key + ' successfully');
        return data;
      } catch (ex) {
        // We could not access the database... do it again.
        this.uiLog.error(
          'UIStorage - Get Key - ' + _key + ' exception ' + JSON.stringify(ex),
        );
        await new Promise((_internalResolve) => {
          setTimeout(() => {
            _internalResolve(undefined);
          }, 100);
        });
        whileCounter++;
        if (whileCounter === 11) {
          await this.reinitializeStorage();
          this.uiLog.error(
            'UIStorage - Get Key - ' +
              _key +
              ' we try to reconnect to the database and hopefully fix all issues',
          );
        } else if (whileCounter >= 20) {
          this.uiLog.error(
            'UIStorage - Get Key - ' +
              _key +
              ' we stop to try getting data now 20 attempts are enough - show error',
          );
          await this.uiAlert.showIOSIndexedDBIssues(
            'IOS_DATABASE_ISSUE_DESCRIPTION',
            'IOS_DATABASE_ISSUE_TITLE',
            true,
          );
          return null;
        }
      }
    }
  }

  public async export(): Promise<any> {
    const exportObj = {};

    await this._storage.forEach((_value, _key, _index) => {
      exportObj[_key] = _value;
    });

    // #520 - Remove username and password before export.
    if (exportObj && 'SETTINGS' in exportObj) {
      exportObj['SETTINGS'][0].visualizer_username = '';
      exportObj['SETTINGS'][0].visualizer_password = '';
    }

    return exportObj;
  }

  public async clearStorage() {
    await this._storage.clear();
  }

  public async hasData(): Promise<boolean> {
    let hasData: boolean = false;

    try {
      await this._storage.forEach((_value, _key, _index) => {
        if (_key === 'VERSION') {
          try {
            if (
              _value?.length > 0 &&
              _value[0]['updatedDataVersions'].length > 0
            ) {
              hasData = true;
              return true;
            }
          } catch (ex) {}
        }
      });
      return hasData;
    } catch (ex) {
      return false;
    }
  }

  public async hasCorruptedData(): Promise<{
    CORRUPTED: boolean;
    DATA: {
      BREWS: number;
      MILL: number;
      PREPARATION: number;
      BEANS: number;
    };
  }> {
    const hasDataObj = {
      BREWS: 0,
      MILL: 0,
      PREPARATION: 0,
      BEANS: 0,
    };
    try {
      await this._storage.forEach((_value, _key, _index) => {
        if (
          _key === 'BREWS' ||
          _key === 'MILL' ||
          _key === 'PREPARATION' ||
          _key === 'BEANS'
        ) {
          try {
            if (_value?.length > 0) {
              hasDataObj[_key] = _value?.length;
            } else {
              hasDataObj[_key] = 0;
            }
          } catch (ex) {}
        }
      });
      if (
        hasDataObj.BREWS > 0 &&
        (hasDataObj.MILL <= 0 ||
          hasDataObj.PREPARATION <= 0 ||
          hasDataObj.BEANS <= 0)
      ) {
        /**
         * If we got brews but not a mill / preparation / or bean something broke hard.
         * We saw this issue on android that a user got brews but no beans anymore, they where lost
         */
        return { CORRUPTED: true, DATA: hasDataObj };
      } else {
        return { CORRUPTED: false, DATA: hasDataObj };
      }
    } catch (ex) {
      return { CORRUPTED: false, DATA: hasDataObj };
    }
  }

  public async import(_data: any): Promise<any> {
    // Before we import, we do a saftey backup
    const _backup = await this.__safteyBackup();
    try {
      await this.__importBackup(_data);

      return { BACKUP: false };
    } catch (ex) {
      try {
        await this.__importBackup(_backup);
        return { BACKUP: true };
      } catch (ex) {
        throw { BACKUP: true };
      }
    }
  }

  private async __safteyBackup(): Promise<any> {
    return await this.export();
  }

  private async __importBackup(_data: any): Promise<void> {
    const keysCount: number = Object.keys(_data).length;
    let finishedImport = 0;
    for (const key in _data) {
      if (Object.prototype.hasOwnProperty.call(_data, key)) {
        await this._storage.set(key, _data[key]);
        finishedImport++;
        if (keysCount === finishedImport) {
          return;
        }
      }
    }
  }
}
