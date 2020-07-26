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
export class UIMillHelper {

  private allStoredBrews: Array<Brew> = [];
  constructor(private readonly uiBrewStorage: UIBrewStorage) {
    this.uiBrewStorage.attachOnRemove().subscribe((_val) => {
      // If an brew is deleted, we need to reset our array for the next call.
      this.allStoredBrews = [];
    });
  }

  public getAllBrewsForThisMill(_uuid: string): Array<Brew> {

    if (this.allStoredBrews.length <= 0) {
      // Load just if needed, performance reasons
      this.allStoredBrews = this.uiBrewStorage.getAllEntries();
    }

    const brewsForMill: Array<Brew> = [];
    const brews: Array<Brew> = this.allStoredBrews;

    const millUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.mill === millUUID) {
        brewsForMill.push(brew);
      }
    }
    return brewsForMill;

  }

}
