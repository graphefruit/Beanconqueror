/**Core**/
import {Injectable} from '@angular/core';
/**Services **/

import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {UIBeanStorage}  from '../services/uiBeanStorage';
import {UIBrewStorage}  from '../services/uiBrewStorage';
import {UIHelper}  from '../services/uiHelper';

/**Interfaces**/
import {IBrew} from '../interfaces/brew/iBrew';
@Injectable()
export class UIStatistic {

  constructor(private uiPreparationStorage: UIPreparationStorage,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage: UIBrewStorage, private uiHelper: UIHelper) {
  }


  private getLastBrew(): IBrew {
    let brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
    if (brews.length > 0) {
      let lastIndex: number = brews.length - 1;
      let lastBrew: IBrew = brews[lastIndex];
      return lastBrew;
    }
    return null;

  }

  public getBrewsDrunk(): number {
    return this.uiBrewStorage.getAllEntries().length;
  }

  public getBeansCount(): number {
    return this.uiBeanStorage.getAllEntries().length;
  }

  public getPreparationsCount(): number {
    return this.uiPreparationStorage.getAllEntries().length;
  }

  public getLastDrunkBrewTimestamp(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return this.uiHelper.formateDate(lastBrew.config.unix_timestamp, "HH:mm:ss, DD.MM.YYYY");
    }
    return "-";
  }

  public getTimePassedSinceLastBrew():string{
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      let timeDiff = this.uiHelper.timeDifference(lastBrew.config.unix_timestamp);
      return "Minuten: " + timeDiff.MINUTES ;
    }
    return "";
  }

  public getLastBeanUsed(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return lastBrew.bean;
    }
    return "";
  }

  public getLastPreparationMethodUsed(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return lastBrew.methodOfPreparation;
    }
    return "";
  }


}
