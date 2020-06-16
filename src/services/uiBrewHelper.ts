/** Core */
import {Injectable} from '@angular/core';

import {UIBeanStorage} from './uiBeanStorage';
import {UIMillStorage} from './uiMillStorage';
import {UIPreparationStorage} from './uiPreparationStorage';
import {UIAlert} from './uiAlert';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIBrewHelper {

  constructor (private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiAlert: UIAlert) {

  }

  public canBrew(): boolean {
    const hasBeans: boolean = (this.uiBeanStorage.getAllEntries().length > 0 && this.uiBeanStorage.getAllEntries()
      .filter((bean) => !bean.finished).length > 0);
    const hasPreparationMethods: boolean = (this.uiPreparationStorage.getAllEntries().length > 0);
    const hasMills: boolean = (this.uiMillStorage.getAllEntries().length > 0);

    return hasBeans && hasPreparationMethods && hasMills;
  }

  public canBrewIfNotShowMessage() {
    if (this.canBrew() === false) {
      this.uiAlert.presentCustomPopover('CANT_START_NEW_BREW_TITLE', 'CANT_START_NEW_BREW_DESCRIPTION', 'UNDERSTOOD');
      return false;
    }
    return true;
  }

}
