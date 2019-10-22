/** Core */
import {Injectable} from '@angular/core';
/** Ionic native */
/** Classes */
import {Preparation} from '../classes/preparation/preparation';
import {StorageClass} from '../classes/storageClass';
/** Interfaces */
import {IPreparation} from '../interfaces/preparation/iPreparation';
/** Services */
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';

@Injectable({
  providedIn: 'root'
})
export class UIPreparationStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIPreparationStorage;

  public static getInstance(): UIPreparationStorage {
    if (UIPreparationStorage.instance) {
      return UIPreparationStorage.instance;
    }

    return undefined;
  }
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, 'PREPARATION');
    if (UIPreparationStorage.instance === undefined) {
      UIPreparationStorage.instance = this;
    }
  }

  public getPreparationNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IPreparation> = this.getAllEntries();
    for (const prep of entries) {
      if (prep.config.uuid === _uuid) {
        return prep.name;
      }
    }

    return '_nicht gefunden_';
  }

  public getAllEntries(): Array<Preparation> {
    const preparationEntries: Array<any> = super.getAllEntries();
    const preparations: Array<Preparation> = [];

    for (const prep of preparationEntries) {
      const preparationObj: Preparation = new Preparation();
      preparationObj.initializeByObject(prep);
      preparations.push(preparationObj);

    }

    return preparations;
  }

}
