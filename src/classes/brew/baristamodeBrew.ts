import moment from 'moment';

import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { IBaristamodeBrew } from '../../interfaces/brew/iBaristamodeBrew';
import { ICustomInformationBrew } from '../../interfaces/brew/ICustomInformationBrew';
import { IPreparation } from '../../interfaces/preparation/iPreparation';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Config } from '../objectConfig/objectConfig';
import { Preparation } from '../preparation/preparation';
import { BrewInstanceHelper } from './brew';
import { CustomInformationBrew } from './customInformationBrew';

class BaristamodeBrew implements IBaristamodeBrew {
  public pressure_profile: string;
  // UUID

  public brew_temperature: number;

  public brew_time: number;
  public brew_time_milliseconds: number;

  public coffee_first_drip_time: number;
  public coffee_first_drip_time_milliseconds: number;
  public coffee_blooming_time: number;
  public coffee_blooming_time_milliseconds: number;

  public brew_beverage_quantity: number;

  public brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public method_of_preparation: string;
  public config: Config;

  // Inherits the saved json path
  public flow_profile: string;

  public desired_beverage_quantity: number;
  public water_volume_intake: number;
  public customInformation: ICustomInformationBrew;

  constructor() {
    this.pressure_profile = '';

    this.brew_temperature = 0;

    this.brew_time = 0;
    this.brew_time_milliseconds = 0;

    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;

    this.config = new Config();

    this.brew_beverage_quantity = 0;
    this.brew_beverage_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;

    this.brew_time_milliseconds = 0;

    this.coffee_first_drip_time_milliseconds = 0;
    this.coffee_blooming_time_milliseconds = 0;

    this.desired_beverage_quantity = 0;
    this.water_volume_intake = 0;

    this.flow_profile = '';
    this.customInformation = new CustomInformationBrew();
    this.method_of_preparation = '';
  }

  public initializeByObject(brewObj: IBaristamodeBrew): void {
    Object.assign(this, brewObj);
  }

  public getBrewBeverageQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_beverage_quantity_type];
  }

  private toFixedIfNecessary(value, dp) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  public formateDate(_format?: string): string {
    const settingsDateFormat: string =
      this.getSettingsStorageInstance().getSettings().date_format;
    let format: string = settingsDateFormat + ', HH:mm:ss';
    if (_format) {
      format = _format;
    }

    return moment.unix(this.config.unix_timestamp).format(format);
  }
  private getSettingsStorageInstance(): UISettingsStorage {
    let uiSettingsStorage: UISettingsStorage;
    uiSettingsStorage = UISettingsStorage.getInstance();

    return uiSettingsStorage;
  }
  public getMillisecondsFormat() {
    const millisecondsDigits: number =
      this.getSettingsStorageInstance().getSettings()
        .brew_milliseconds_leading_digits;
    if (millisecondsDigits === 3) {
      return '.SSS';
    } else if (millisecondsDigits === 2) {
      return '.SS';
    }
    return '.S';
  }

  public getFormattedTotalCoffeeBrewTime(): string {
    const secs = this.brew_time;

    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    let formatted = '';
    if (millisecondsEnabled) {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.brew_time_milliseconds)
        .format('mm:ss' + this.getMillisecondsFormat());
    } else {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.brew_time_milliseconds)
        .format('mm:ss');
    }

    if (moment.utc(secs * 1000).hours() > 0) {
      if (millisecondsEnabled) {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.brew_time_milliseconds)
          .format('HH:mm:ss' + this.getMillisecondsFormat());
      } else {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.brew_time_milliseconds)
          .format('HH:mm:ss');
      }
    }
    return formatted;
  }

  public getFormattedTotalCoffeeBloomingTime(): string {
    const secs = this.coffee_blooming_time;

    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    let formatted = '';
    if (millisecondsEnabled) {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.coffee_blooming_time_milliseconds)
        .format('mm:ss' + this.getMillisecondsFormat());
    } else {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.coffee_blooming_time_milliseconds)
        .format('mm:ss');
    }

    if (moment.utc(secs * 1000).hours() > 0) {
      if (millisecondsEnabled) {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.coffee_blooming_time_milliseconds)
          .format('HH:mm:ss' + this.getMillisecondsFormat());
      } else {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.coffee_blooming_time_milliseconds)
          .format('HH:mm:ss');
      }
    }
    return formatted;
  }

  public getFormattedTotalCoffeeFirstDripTime(): string {
    const secs = this.coffee_first_drip_time;

    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    let formatted = '';
    if (millisecondsEnabled) {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.coffee_first_drip_time_milliseconds)
        .format('mm:ss' + this.getMillisecondsFormat());
    } else {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.coffee_first_drip_time_milliseconds)
        .format('mm:ss');
    }

    if (moment.utc(secs * 1000).hours() > 0) {
      if (millisecondsEnabled) {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.coffee_first_drip_time_milliseconds)
          .format('HH:mm:ss' + this.getMillisecondsFormat());
      } else {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.coffee_first_drip_time_milliseconds)
          .format('HH:mm:ss');
      }
    }
    return formatted;
  }

  public getFormattedBrewTime(): string {
    const secs = this.brew_time;
    let formattingStr: string = 'HH:mm:ss';
    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    if (millisecondsEnabled) {
      formattingStr = 'HH:mm:ss' + this.getMillisecondsFormat();
    }
    const formatted = moment
      .utc(secs * 1000)
      .add('milliseconds', this.brew_time_milliseconds)
      .format(formattingStr);
    return formatted;
  }

  public getFormattedCoffeeBrewTime(): string {
    const secs = this.brew_time;
    let formattingStr: string = 'HH:mm:ss';
    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    if (millisecondsEnabled) {
      formattingStr = 'HH:mm:ss' + this.getMillisecondsFormat();
    }
    const start = moment()
      .startOf('day')
      .add('seconds', secs)
      .add('milliseconds', this.brew_time_milliseconds);
    if (
      this.coffee_first_drip_time > 0 ||
      this.coffee_first_drip_time_milliseconds
    ) {
      const diffing = moment()
        .startOf('day')
        .add('seconds', this.coffee_first_drip_time)
        .add('milliseconds', this.coffee_first_drip_time_milliseconds);
      if (this.coffee_first_drip_time > this.brew_time) {
        return ' - ' + moment.utc(diffing.diff(start)).format(formattingStr);
      } else {
        return moment.utc(start.diff(diffing)).format(formattingStr);
      }
    } else {
      return start.format(formattingStr);
    }
  }

  public getGraphPath() {
    return 'baristamode/' + this.config.uuid + '_flow_profile.json';
  }

  public getPreparation(): Preparation {
    const uniqueCachingID = this.config.uuid + '-' + this.method_of_preparation;
    if (
      BrewInstanceHelper.preparations[uniqueCachingID] === undefined ||
      BrewInstanceHelper.preparations[uniqueCachingID].config.uuid !==
        this.method_of_preparation
    ) {
      const iPreparation: IPreparation =
        this.getPreparationStorageInstance().getByUUID(
          this.method_of_preparation,
        ) as IPreparation;
      const preparation: Preparation = new Preparation();
      preparation.initializeByObject(iPreparation);

      BrewInstanceHelper.preparations[uniqueCachingID] = preparation;
    }

    return BrewInstanceHelper.preparations[uniqueCachingID];
  }

  private getPreparationStorageInstance(): UIPreparationStorage {
    let uiPreparationStorage: UIPreparationStorage;
    uiPreparationStorage = UIPreparationStorage.getInstance();

    return uiPreparationStorage;
  }
}

export default BaristamodeBrew;
