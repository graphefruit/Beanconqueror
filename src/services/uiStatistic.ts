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
import {TranslateService} from '@ngx-translate/core';

/** Services  */


@Injectable({
  providedIn: 'root'
})
export class UIStatistic {

  constructor (private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiHelper: UIHelper,
               private readonly uiSettings: UISettingsStorage,
               private readonly translate: TranslateService) {
  }

  public getSpentMoneyForCoffeeBeans(): number {
    let costs: number = 0;
    const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
    for (const i of beans) {
      if (i.cost !== undefined && i.cost > 0) {
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


  public getTimePassedSinceLastBrewMessage(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      const timeDiff = this.uiHelper.timeDifference(lastBrew.config.unix_timestamp);

      if (timeDiff.DAYS === 1) {
        return this.translate.instant('ONE_DAY');
      }
      if (timeDiff.DAYS > 1) {
        return `${this.translate.instant('DAYS')}`;
      }

      if (timeDiff.HOURS === 1) {
        return this.translate.instant('ONE_HOUR');
      }
      if (timeDiff.HOURS > 1) {
        return `${this.translate.instant('HOURS')}`;
      }

      if (timeDiff.MINUTES === 1) {
        return this.translate.instant('ONE_MINUTE');
      }

      return `${this.translate.instant('MINUTES')}`;
    }

    return `${this.translate.instant('DAYS')}`;
  }

  public getTimePassedSinceLastBrew(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      const timeDiff = this.uiHelper.timeDifference(lastBrew.config.unix_timestamp);

      if (timeDiff.DAYS === 1) {
        return '1';
      }
      if (timeDiff.DAYS > 1) {
        return `${timeDiff.DAYS}`;
      }

      if (timeDiff.HOURS === 1) {
        return '1';
      }
      if (timeDiff.HOURS > 1) {
        return `${timeDiff.HOURS}`;
      }

      if (timeDiff.MINUTES === 1) {
        return '1';
      }

      return `${timeDiff.MINUTES}`;
    }

    return '0';
  }

  public getSloganTimePassedSinceLastBrew(): string {
    const timePassed = this.getTimePassedSinceLastBrew();
    if (timePassed !== '') {
      return `${this.getTimePassedSinceLastBrewMessage()} ${this.translate.instant('WITHOUT_COFFEE')}`;
    }

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public getLastBeanUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiBeanStorage.getBeanNameByUUID(lastBrew.bean);
    }

    return this.translate.instant('NOT_FOUND');
  }

  public getLastPreparationMethodUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiPreparationStorage.getPreparationNameByUUID(lastBrew.method_of_preparation);
    }

    return this.translate.instant('NOT_FOUND');
  }

  public getLastMillUsed(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      return this.uiMillStorage.getMillNameByUUID(lastBrew.mill);
    }

    return this.translate.instant('NOT_FOUND');
  }

  /**
   * Returns in KG
   */
  public getTotalGround(): number {

      const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
      if (brews.length > 0) {
        let sum = 0;
        for (const brew of brews) {
          sum += +brew.grind_weight;
        }

        return Math.round((sum / 1000) * 100) / 100;
      }

    return 0;
  }

  /**
   * Retruns in kg/litres
   */
  public getTotalDrunk(): number {
    const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
    if (brews.length > 0) {
      let sum = 0;
      for (const brew of brews) {
        sum += brew.brew_quantity;
      }
      return Math.round((sum / 1000) * 100) / 100;
    }
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
