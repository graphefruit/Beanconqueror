/**Core**/
import {Injectable} from '@angular/core';
/**Ionic native**/
/**Classes**/
import {Preparation} from '../classes/preparation/preparation';
/**Interfaces**/
import {IPreparation} from '../interfaces/preparation/iPreparation';
/**Services**/
import {UIHelper} from '../services/uiHelper';
import {UILog} from '../services/uiLog';
import {UIStorage} from  '../services/uiStorage';
import {StorageClass} from  '../classes/storageClass';
import {Mill} from "../classes/mill/mill";
import {IMill} from "../interfaces/mill/iMill";


@Injectable()
export class UIMillStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIMillStorage;
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, "MILL");
    if (UIMillStorage.instance == null) {
      UIMillStorage.instance = this;
    }
  }

  public getMillNameByUUID(_uuid: string):string {
    if (_uuid.toLowerCase() === "standard") {
      return "Standard";
    }
    else {
      let entries: Array<IMill> = this.getAllEntries();
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].config.uuid === _uuid) {
          return entries[i].name;
        }
      }


      return "_nicht gefunden_";
    }
  }


  public static getInstance(): UIMillStorage {
    if (UIMillStorage.instance) {
      return UIMillStorage.instance;
    }
    return null;
  }

  public getAllEntries(): Array<Mill> {
    let entries:Array<any> = super.getAllEntries();
    let entry:Array<Mill> = [];

    for (let i=0;i<entries.length;i++){
      let preparationObj:Preparation = new Preparation();
      preparationObj.initializeByObject(entries[i]);
      entry.push(preparationObj);

    }
    return entry;
  }

}
