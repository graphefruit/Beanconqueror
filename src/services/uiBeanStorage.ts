/**Core**/
import {Injectable} from '@angular/core';
/**Ionic native**/

/**Interfaces**/
import {IBean} from '../interfaces/bean/iBean';

/**Services**/
import {UIHelper} from '../services/uiHelper';
import {UILog} from '../services/uiLog';
import {UIStorage} from  '../services/uiStorage';
import {StorageClass} from  '../classes/storageClass';

@Injectable()
export class UIBeanStorage extends StorageClass {

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {

    super(uiStorage,uiHelper,uiLog,"BEANS");

  }

  public getBeanNameByUUID(_uuid: string):string {
    if (_uuid.toLowerCase() === "standard") {
      return "Standard";
    }
    else {
      let entries: Array<IBean> = this.getAllEntries();
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].config.uuid === _uuid) {
          return entries[i].name;
        }
      }


      return "_nicht gefunden_";
    }
  }
}
