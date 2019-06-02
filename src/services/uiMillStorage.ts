/** Core */
import { Injectable } from '@angular/core';
/** Ionic native */
/** Classes */
import { Preparation } from '../classes/preparation/preparation';
/** Interfaces */

/** Services */
import { Mill } from '../classes/mill/mill';
import { StorageClass } from '../classes/storageClass';
import { IMill } from '../interfaces/mill/iMill';
import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';

@Injectable()
export class UIMillStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIMillStorage;

  public static getInstance(): UIMillStorage {
    if (UIMillStorage.instance) {
      return UIMillStorage.instance;
    }
    return undefined;
  }
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, 'MILL');
    if (UIMillStorage.instance === undefined) {
      UIMillStorage.instance = this;
    }
  }

  public getMillNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    } else {
      const entries: Array<IMill> = this.getAllEntries();
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].config.uuid === _uuid) {
          return entries[i].name;
        }
      }

      return '_nicht gefunden_';
    }
  }

  public getAllEntries(): Array<Mill> {
    const entries: Array<any> = super.getAllEntries();
    const entry: Array<Mill> = [];

    for (let i = 0; i < entries.length; i++) {
      const preparationObj: Preparation = new Preparation();
      preparationObj.initializeByObject(entries[i]);
      entry.push(preparationObj);

    }
    return entry;
  }

}
