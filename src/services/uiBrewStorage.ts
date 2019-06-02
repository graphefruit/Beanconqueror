/** Core */
import { Injectable } from '@angular/core';
/** Class */
import { Brew } from '../classes/brew/brew';

/** Services */
import { StorageClass } from '../classes/storageClass';
import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';

@Injectable()
export class UIBrewStorage extends StorageClass {

  /**
   * Singelton instance
   */
  public static instance: UIBrewStorage;

  public static getInstance(): UIBrewStorage {
    if (UIBrewStorage.instance) {
      return UIBrewStorage.instance;
    }
    return undefined;
  }

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {

    super(uiStorage, uiHelper, uiLog, 'BREWS');

    if (UIBrewStorage.instance === undefined) {
      UIBrewStorage.instance = this;
    }
  }

  public getAllEntries(): Array<Brew> {
    const brewEntries: Array<any> = super.getAllEntries();
    const brews: Array<Brew> = [];

    for (let i = 0; i < brewEntries.length; i++) {
      const brewObj: Brew = new Brew();
      brewObj.initializeByObject(brewEntries[i]);
      brews.push(brewObj);

    }
    return brews;
  }

}
