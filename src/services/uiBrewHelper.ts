/**Core**/
import {Injectable} from '@angular/core';

import {UIBeanStorage} from "./uiBeanStorage";
import {UIMillStorage} from "./uiMillStorage";
import {UIPreparationStorage} from "./uiPreparationStorage";
import {Platform} from "ionic-angular";
import {SocialSharing} from "@ionic-native/social-sharing";


/**
 * Handles every helping functionalities
 */
@Injectable()
export class UIBrewHelper {

  constructor(private platform: Platform, private uiBeanStorage:UIBeanStorage, private uiMillStorage:UIMillStorage, private uiPreparationStorage:UIPreparationStorage){

  }

  public canBrew():boolean {

    let hasBeans:boolean = (this.uiBeanStorage.getAllEntries().length > 0 && this.uiBeanStorage.getAllEntries().filter(bean => bean.finished  === false).length>0);
    let hasPreparationMethods:boolean = (this.uiPreparationStorage.getAllEntries().length > 0);
    let hasMills:boolean = (this.uiMillStorage.getAllEntries().length > 0);
    return hasBeans && hasPreparationMethods && hasMills;


  }


}
