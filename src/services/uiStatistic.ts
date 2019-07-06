/** Core */
import {Injectable} from '@angular/core';
import {UIBeanStorage} from './uiBeanStorage';
import {UIBrewStorage} from './uiBrewStorage';
import {UIHelper} from './uiHelper';
import {UIPreparationStorage} from './uiPreparationStorage';
/** Interfaces */
import {Bean} from '../classes/bean/bean';
import {IBrew} from '../interfaces/brew/iBrew';
import {UIMillStorage} from './uiMillStorage';
import {UISettingsStorage} from './uiSettingsStorage';

/** Services  */

@Injectable()
export class UIStatistic {

  constructor (private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiSettings: UISettingsStorage) {
  }

  public getSpentMoneyForCoffeeBeans(): number {

    let costs: number = 0;
    const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
    for (const i of beans) {
      if (i.cost !== undefined && i.cost !== undefined && i.cost > 0) {
        costs += i.cost;
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

  public getMillsCount(): number {
    return this.uiMillStorage.getAllEntries().length;
  }

  public getLastDrunkBrewTimestamp(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiHelper.formateDate(lastBrew.config.unix_timestamp, 'DD.MM.YYYY, HH:mm:ss');
    }

    return '';
  }

  public getTimePassedSinceLastBrew(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      const timeDiff = this.uiHelper.timeDifference(lastBrew.config.unix_timestamp);

      if (timeDiff.DAYS === 1) {
        return "Ein Tag";
      }
      if (timeDiff.DAYS > 1) {
        return `${timeDiff.DAYS} Tage`;
      }

      if (timeDiff.HOURS === 1) {
        return "Eine Stunde"
      }
      if (timeDiff.HOURS > 1) {
        return `${timeDiff.HOURS} Stunden`;
      }

      if (timeDiff.MINUTES === 1) {
        return "Eine Minute";
      }

      return `${timeDiff.MINUTES} Minuten`;
    }

    return '';
  }

  public getSloganTimePassedSinceLastBrew(): string {
    const timePassed = this.getTimePassedSinceLastBrew();
    if (timePassed !== '') {
      return `${timePassed} ohne Kaffee`;
    }

    return 'Noch kein Kaffee getrunken.';
  }

  public getLastBeanUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiBeanStorage.getBeanNameByUUID(lastBrew.bean);
    }

    return '_nicht gefunden_';
  }

  public getLastPreparationMethodUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiPreparationStorage.getPreparationNameByUUID(lastBrew.method_of_preparation);
    }

    return '_nicht gefunden_';
  }

  public getLastMillUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiMillStorage.getMillNameByUUID(lastBrew.mill);
    }

    return '_nicht gefunden_';
  }

  public getTotalGround(): number {
    if (this.uiSettings.getSettings().grind_weight) {
      const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let sum = 0;
        for (const brew of brews) {
          sum += +brew.grind_weight;
        }

        return sum;
      }
    }

    return 0;
  }

  public getTotalDrunk(): number {
    if (this.uiSettings.getSettings().brew_quantity) {
      const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let sum = 0;
        for (const brew of brews) {
          sum += brew.brew_quantity;
        }

        return sum;
      }
    }

    return 0;
  }

  private getLastBrew(): IBrew {
    const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
    if (brews.length > 0) {
      const lastIndex: number = brews.length - 1;
      const lastBrew: IBrew = brews[lastIndex];

      return lastBrew;
    }

    return undefined;

  }

}
