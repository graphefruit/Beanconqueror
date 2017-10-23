/**Core**/
import {Injectable} from '@angular/core';
/**Ionic native**/


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

}
