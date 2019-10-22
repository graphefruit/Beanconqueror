/** Core */
import {Injectable} from '@angular/core';
/** Ionic native */
/** Classes */
import {Preparation} from '../classes/preparation/preparation';
/** Services */
import {Mill} from '../classes/mill/mill';
import {StorageClass} from '../classes/storageClass';
import {IMill} from '../interfaces/mill/iMill';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';

/** Interfaces */

@Injectable({
  providedIn: 'root'
})
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
    }

    const entries: Array<IMill> = this.getAllEntries();
    for (const mill of entries) {
      if (mill.config.uuid === _uuid) {
        return mill.name;
      }
    }

    return '_nicht gefunden_';
  }

  public getAllEntries(): Array<Mill> {
    const entries: Array<any> = super.getAllEntries();
    const entry: Array<Mill> = [];

    for (const mill of entries) {
      const preparationObj: Preparation = new Preparation();
      preparationObj.initializeByObject(mill);
      entry.push(preparationObj);

    }

    return entry;
  }

}
