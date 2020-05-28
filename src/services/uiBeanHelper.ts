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
export class UIBeanHelper {

  constructor(private readonly uiBrewStorage: UIBrewStorage) {

  }

  public getAllBrewsForThisBean(_uuid: string): Array<Brew> {

    const brewsForBean: Array<Brew> = [];
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const beanUUID: string = _uuid;
    for (const brew of brews) {
      if (brew.bean === beanUUID) {
        brewsForBean.push(brew);
      }
    }
    return brewsForBean;

  }

}
