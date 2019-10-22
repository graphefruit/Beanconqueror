/** Core */
import {Injectable} from '@angular/core';

import {UIBeanStorage} from './uiBeanStorage';
import {UIMillStorage} from './uiMillStorage';
import {UIPreparationStorage} from './uiPreparationStorage';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIBrewHelper {

  constructor (private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiPreparationStorage: UIPreparationStorage) {

  }

  public canBrew(): boolean {
    const hasBeans: boolean = (this.uiBeanStorage.getAllEntries().length > 0 && this.uiBeanStorage.getAllEntries()
      .filter((bean) => !bean.finished).length > 0);
    const hasPreparationMethods: boolean = (this.uiPreparationStorage.getAllEntries().length > 0);
    const hasMills: boolean = (this.uiMillStorage.getAllEntries().length > 0);

    return hasBeans && hasPreparationMethods && hasMills;
  }

}
