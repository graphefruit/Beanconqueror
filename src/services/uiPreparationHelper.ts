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
  private allStoredBrews: Array<Brew> = [];
  constructor(private readonly uiBrewStorage: UIBrewStorage) {
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });
  }

  public getAllBrewsForThisPreparation(_uuid: string): Array<Brew> {


    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForPreparation: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;
    const preparationUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.method_of_preparation === preparationUUID) {
        brewsForPreparation.push(brew);
      }
    }
    return brewsForPreparation;

  }

}
