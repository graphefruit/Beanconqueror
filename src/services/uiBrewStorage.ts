/**Core**/
import {Injectable} from '@angular/core';
/**Class**/
import {Brew} from '../classes/brew/brew';

/**Services**/
import {UIHelper} from '../services/uiHelper';
import {UILog} from '../services/uiLog';
import {UIStorage} from  '../services/uiStorage';
import {StorageClass} from  '../classes/storageClass';

@Injectable()
export class UIBrewStorage extends StorageClass {

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {

    super(uiStorage,uiHelper,uiLog,"BREWS");

  }

  public getAllEntries(): Array<Brew> {
    let brewEntries:Array<any> = super.getAllEntries();
    let brews:Array<Brew> = [];

    for (let i=0;i<brewEntries.length;i++){
      let brewObj:Brew = new Brew();
      brewObj.initializeByObject(brewEntries[i]);
      brews.push(brewObj);

    }
    return brews;
  }


}
