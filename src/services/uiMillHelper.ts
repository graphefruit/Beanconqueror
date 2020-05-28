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

  constructor(private readonly uiBrewStorage: UIBrewStorage) {

  }

  public getAllBrewsForThisMill(_uuid: string): Array<Brew> {

    const brewsForMill: Array<Brew> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const millUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.mill === millUUID) {
        brewsForMill.push(brew);
      }
    }
    return brewsForMill;

  }

}
