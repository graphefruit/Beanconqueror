/** Core */
import { Injectable } from '@angular/core';
/** Ionic native */
/** Classes */
import { Preparation } from '../classes/preparation/preparation';
import { StorageClass } from '../classes/storageClass';
/** Interfaces */
import { IPreparation } from '../interfaces/preparation/iPreparation';
/** Services */
import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';

@Injectable()
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
    } else {
      const entries: Array<IPreparation> = this.getAllEntries();
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].config.uuid === _uuid) {
          return entries[i].name;
        }
      }

      return '_nicht gefunden_';
    }
  }

  public getAllEntries(): Array<Preparation> {
    const preparationEntries: Array<any> = super.getAllEntries();
    const preparations: Array<Preparation> = [];

    for (let i = 0; i < preparationEntries.length; i++) {
      const preparationObj: Preparation = new Preparation();
      preparationObj.initializeByObject(preparationEntries[i]);
      preparations.push(preparationObj);

    }
    return preparations;
  }

}
