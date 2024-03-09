/** Core */
import { Injectable } from '@angular/core';
import { UIBeanStorage } from './uiBeanStorage';
import { UIBrewStorage } from './uiBrewStorage';
import { UIHelper } from './uiHelper';
import { UIPreparationStorage } from './uiPreparationStorage';
/** Interfaces */
import { Bean } from '../classes/bean/bean';
import { IBrew } from '../interfaces/brew/iBrew';
import { UIMillStorage } from './uiMillStorage';
import { UISettingsStorage } from './uiSettingsStorage';
import { TranslateService } from '@ngx-translate/core';
import { IPreparation } from '../interfaces/preparation/iPreparation';
import { IMill } from '../interfaces/mill/iMill';
import { IBean } from '../interfaces/bean/iBean';
import { IGreenBean } from '../interfaces/green-bean/iGreenBean';
import { IRoastingMachine } from '../interfaces/roasting-machine/iRoastingMachine';
import { UIGreenBeanStorage } from './uiGreenBeanStorage';
import { UIRoastingMachineStorage } from './uiRoastingMachineStorage';

/** Services  */

@Injectable({
  providedIn: 'root',
})
export class UIStatistic {
  constructor(
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiSettings: UISettingsStorage,
    private readonly translate: TranslateService
  ) {}

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
      return this.uiHelper.formateDate(
        lastBrew.config.unix_timestamp,
        this.uiSettings.getSettings().date_format + ', HH:mm:ss'
      );
    }

    return '';
  }

  public getTimePassedSinceLastBrewMessage(): string {
    const lastBrew: IBrew = this.getLastBrew();
    if (lastBrew !== undefined) {
      const timeDiff = this.uiHelper.timeDifference(
        lastBrew.config.unix_timestamp
      );

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
      const timeDiff = this.uiHelper.timeDifference(
        lastBrew.config.unix_timestamp
      );

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
      return `${this.getTimePassedSinceLastBrewMessage()} ${this.translate.instant(
        'WITHOUT_COFFEE'
      )}`;
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
      return this.uiPreparationStorage.getPreparationNameByUUID(
        lastBrew.method_of_preparation
      );
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
        if (brew.bean_weight_in > 0) {
          sum += +brew.bean_weight_in;
        } else {
          sum += +brew.grind_weight;
        }
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
        // # 400
        if (brew.brew_beverage_quantity > 0) {
          sum += brew.brew_beverage_quantity;
        } else {
          sum += brew.brew_quantity;
        }
      }
      return Math.round((sum / 1000) * 100) / 100;
    }
    return 0;
  }

  public brewedTime() {
    const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
    if (brews.length > 0) {
      let sum = 0;
      for (const brew of brews) {
        sum += brew.brew_time;
      }
      return this.uiHelper.formatSeconds(sum, 'HH:mm:ss');
    }
    return this.uiHelper.formatSeconds(0, 'HH:mm:ss');
  }
  public photosTaken() {
    const allEntries: Array<
      IBrew | IMill | IPreparation | IBean | IGreenBean | IRoastingMachine
    > = [
      ...this.uiBrewStorage.getAllEntries(),
      ...this.uiMillStorage.getAllEntries(),
      ...this.uiPreparationStorage.getAllEntries(),
      ...this.uiBeanStorage.getAllEntries(),
      ...this.uiGreenBeanStorage.getAllEntries(),
      ...this.uiRoastingMachineStorage.getAllEntries(),
    ];

    if (allEntries.length > 0) {
      let sum = 0;
      for (const entry of allEntries) {
        sum += entry.attachments.length;
      }
      return sum;
    }
    return 0;
  }

  private getLastBrew(): IBrew {
    const brews: Array<IBrew> = this.uiBrewStorage.getAllEntries();
    const sortedBrews = brews.sort((n1, n2) => {
      if (n1.config.unix_timestamp > n2.config.unix_timestamp) {
        return 1;
      }

      if (n1.config.unix_timestamp < n2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });

    if (sortedBrews.length > 0) {
      const lastIndex: number = sortedBrews.length - 1;
      const lastBrew: IBrew = sortedBrews[lastIndex];

      return lastBrew;
    }

    return undefined;
  }
}
