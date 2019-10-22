/** Core */
import {Injectable} from '@angular/core';
/** Class */
import {Brew} from '../classes/brew/brew';
/** Services */
import {StorageClass} from '../classes/storageClass';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';


@Injectable({
  providedIn: 'root'
})
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

    for (const brew of brewEntries) {
      const brewObj: Brew = new Brew();
      brewObj.initializeByObject(brew);
      brews.push(brewObj);
    }

    return brews;
  }

}
