/** Core */
import {Injectable} from '@angular/core';

import {Brew} from '../classes/brew/brew';
import {UIBrewStorage} from './uiBrewStorage';

/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIPreparationHelper {

  constructor(private readonly uiBrewStorage: UIBrewStorage) {

  }

  public getAllBrewsForThisPreparation(_uuid: string): Array<Brew> {

    const brewsForPreparation: Array<Brew> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const preparationUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.method_of_preparation === preparationUUID) {
        brewsForPreparation.push(brew);
      }
    }
    return brewsForPreparation;

  }

}
