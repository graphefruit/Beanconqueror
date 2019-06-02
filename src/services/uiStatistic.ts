/** Core */
import {Injectable} from '@angular/core';
/** Services  */

import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {UIBeanStorage}  from '../services/uiBeanStorage';
import {UIBrewStorage}  from '../services/uiBrewStorage';
import {UIHelper}  from '../services/uiHelper';

/** Interfaces */
import {IBrew} from '../interfaces/brew/iBrew';
import {Bean} from "../classes/bean/bean";
import {UIMillStorage} from "./uiMillStorage";
import {UISettingsStorage} from "./uiSettingsStorage";

@Injectable()
export class UIStatistic {

  constructor(private uiPreparationStorage: UIPreparationStorage,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage: UIBrewStorage, private uiMillStorage:UIMillStorage, private uiHelper: UIHelper, private uiSettings:UISettingsStorage) {
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


  public getSpentMoneyForCoffeeBeans()
  {

      let costs:number = 0;
      let beans:Array<Bean> = this.uiBeanStorage.getAllEntries();
      for (let i=0;i<beans.length;i++)
      {
        let cost:number = beans[i].cost;
        if (cost != null && cost != undefined && cost > 0)
        {
         costs+=cost;
        }
      }
    return costs;


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
  public getMillsCount(): number
  {
    return this.uiMillStorage.getAllEntries().length;
  }


  public getLastDrunkBrewTimestamp(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return this.uiHelper.formateDate(lastBrew.config.unix_timestamp, "DD.MM.YYYY, HH:mm:ss");
    }
    return "";
  }

  public getTimePassedSinceLastBrew():string{
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      let timeDiff = this.uiHelper.timeDifference(lastBrew.config.unix_timestamp);
      if (timeDiff.MINUTES === 1){
        return timeDiff.MINUTES + " Minute" ;
      }
      else{
        return timeDiff.MINUTES + " Minuten" ;
      }

    }
    return "";
  }

  public getSloganTimePassedSinceLastBrew():string{
    let timePassed = this.getTimePassedSinceLastBrew();
    if (timePassed != "") {
      return timePassed + " ohne Kaffee"
    }
    return "Noch kein Kaffee getrunken."
  }

  public getLastBeanUsed(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return this.uiBeanStorage.getBeanNameByUUID(lastBrew.bean);
    }
    return "_nicht gefunden_";
  }

  public getLastPreparationMethodUsed(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return this.uiPreparationStorage.getPreparationNameByUUID(lastBrew.method_of_preparation);
    }
    return "_nicht gefunden_";
  }
  public getLastMillUsed(): string {
    let lastBrew:IBrew = this.getLastBrew();
    if (lastBrew != null) {
      return this.uiMillStorage.getMillNameByUUID(lastBrew.mill);
    }
    return "_nicht gefunden_";
  }

  public getTotalGround(): number {
    if (this.uiSettings.getSettings().grind_weight === true) {
      let brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let sum = 0;
        for (let brew of brews) {
          sum += +brew.grind_weight;
        }
        return sum;
      }
    }
    return 0;
  }

  public getTotalDrunk(): number {
    if (this.uiSettings.getSettings().brew_quantity === true) {
      let brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let sum = 0;
        for (let brew of brews) {
          sum += brew.brew_quantity;
        }
        return sum;
      }
    }
    return 0;
  }


}
