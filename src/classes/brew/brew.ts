/** Interfaces */
import { IBean } from '../../interfaces/bean/iBean';
import { IBrew } from '../../interfaces/brew/iBrew';
import { IPreparation } from '../../interfaces/preparation/iPreparation';
/** Classes */
/** Third party */
import moment from 'moment';
import { BREW_QUANTITY_TYPES_ENUM } from '../../enums/brews/brewQuantityTypes';
import { IMill } from '../../interfaces/mill/iMill';
/** Services */
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { Bean } from '../bean/bean';
import { Mill } from '../mill/mill';
import { Config } from '../objectConfig/objectConfig';
import { Preparation } from '../preparation/preparation';
import { ICupping } from '../../interfaces/cupping/iCupping';
import { IBrewCoordinates } from '../../interfaces/brew/iBrewCoordinates';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { PreparationTool } from '../preparation/preparationTool';
import { IFlavor } from '../../interfaces/flavor/iFlavor';
import { UIWaterStorage } from '../../services/uiWaterStorage';

import { IWater } from '../../interfaces/water/iWater';
import { Water } from '../water/water';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { IPreparationDeviceBrew } from '../../interfaces/brew/iPreparationDeviceBrew';
import { PreparationDeviceBrew } from './preparationDeviceBrew';

export class Brew implements IBrew {
  // tslint:disable-next-line
  public grind_size: string;
  // tslint:disable-next-line
  public grind_weight: number;
  // UUID
  // tslint:disable-next-line
  public method_of_preparation: string;
  // UUID
  public mill: string;
  // tslint:disable-next-line
  public mill_speed: number;
  // tslint:disable-next-line
  public mill_timer: number;
  // tslint:disable-next-line
  public pressure_profile: string;
  // UUID
  public bean: string;
  // tslint:disable-next-line
  public brew_temperature: number;
  // tslint:disable-next-line
  public brew_temperature_time: number;

  public brew_temperature_time_milliseconds: number;

  // tslint:disable-next-line
  public brew_time: number;
  public brew_time_milliseconds: number;
  // tslint:disable-next-line
  public brew_quantity: number;
  // tslint:disable-next-line
  public brew_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public note: string;
  public rating: number;
  // tslint:disable-next-line
  public coffee_type: string;
  // tslint:disable-next-line
  public coffee_concentration: string;
  // tslint:disable-next-line
  public coffee_first_drip_time: number;
  public coffee_first_drip_time_milliseconds: number;
  // tslint:disable-next-line
  public coffee_blooming_time: number;
  public coffee_blooming_time_milliseconds: number;
  public attachments: Array<string>;
  public tds: number;
  // UUID
  public water: string;
  public bean_weight_in: number;

  public vessel_weight: number;
  public vessel_name: string;

  public coordinates: IBrewCoordinates;

  public brew_beverage_quantity: number;

  public brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public config: Config;

  public cupping: ICupping;

  public cupped_flavor: IFlavor;

  public method_of_preparation_tools: Array<string>;

  public favourite: boolean;

  // Inherits the saved json path
  public flow_profile: string;

  public preparationDeviceBrew: IPreparationDeviceBrew;

  constructor() {
    this.grind_size = '';
    this.grind_weight = 0;
    this.method_of_preparation = '';
    this.mill = '';
    this.mill_speed = 0;
    this.mill_timer = 0;
    this.pressure_profile = '';
    this.bean = '';
    this.brew_temperature_time = 0;
    this.brew_temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.brew_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;
    this.note = '';
    this.rating = 0;
    this.coffee_type = '';
    this.coffee_concentration = '';
    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;
    this.attachments = [];
    this.config = new Config();
    this.tds = 0;
    this.brew_beverage_quantity = 0;
    this.brew_beverage_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;

    this.brew_time_milliseconds = 0;
    this.brew_temperature_time_milliseconds = 0;
    this.coffee_first_drip_time_milliseconds = 0;
    this.coffee_blooming_time_milliseconds = 0;
    this.coordinates = {
      accuracy: null,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      latitude: null,
      longitude: null,
      speed: null,
    } as IBrewCoordinates;

    this.cupping = {
      body: 0,
      brightness: 0,
      clean_cup: 0,
      complexity: 0,
      cuppers_correction: 0,
      dry_fragrance: 0,
      finish: 0,
      flavor: 0,
      sweetness: 0,
      uniformity: 0,
      wet_aroma: 0,
      notes: '',
    };

    this.cupped_flavor = {
      predefined_flavors: {},
      custom_flavors: [],
    } as IFlavor;

    this.method_of_preparation_tools = [];
    this.bean_weight_in = 0;
    this.favourite = false;
    this.water = '';
    this.vessel_name = '';
    this.vessel_weight = 0;

    this.flow_profile = '';

    this.preparationDeviceBrew = new PreparationDeviceBrew();
  }

  public initializeByObject(brewObj: IBrew): void {
    Object.assign(this, brewObj);

    if (this.cupping === undefined) {
      this.cupping = {
        body: 0,
        brightness: 0,
        clean_cup: 0,
        complexity: 0,
        cuppers_correction: 0,
        dry_fragrance: 0,
        finish: 0,
        flavor: 0,
        sweetness: 0,
        uniformity: 0,
        wet_aroma: 0,
        notes: '',
      };
    }
    if (this.cupped_flavor === undefined) {
      this.cupped_flavor = {
        predefined_flavors: {},
        custom_flavors: [],
      } as IFlavor;
    }
  }

  public hasCustomFlavors(): boolean {
    return this.cupped_flavor.custom_flavors.length > 0;
  }
  public hasPredefinedFlavors(): boolean {
    return Object.keys(this.cupped_flavor.predefined_flavors).length > 0;
  }

  public getBrewQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_quantity_type];
  }
  public getBrewBeverageQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_beverage_quantity_type];
  }

  public getBean(): Bean {
    const iBean: IBean = this.getBeanStorageInstance().getByUUID(
      this.bean
    ) as IBean;
    const bean: Bean = new Bean();
    bean.initializeByObject(iBean);

    return bean;
  }

  public getPreparation(): Preparation {
    const iPreparation: IPreparation =
      this.getPreparationStorageInstance().getByUUID(
        this.method_of_preparation
      ) as IPreparation;
    const preparation: Preparation = new Preparation();
    preparation.initializeByObject(iPreparation);

    return preparation;
  }

  public getMill(): Mill {
    const iMill: IMill = this.getMillStorageInstance().getByUUID(
      this.mill
    ) as IMill;
    const mill: Mill = new Mill();
    mill.initializeByObject(iMill);

    return mill;
  }

  public getWater(): Water {
    const iWater: IWater = this.getWaterStorageInstance().getByUUID(
      this.water
    ) as IWater;
    const water: Water = new Water();
    water.initializeByObject(iWater);

    return water;
  }

  /**
   * Get the calculated bean age for this brew
   * If no age could be calculated it returns -1
   */
  public getCalculatedBeanAge(): number {
    const bean: IBean = this.getBeanStorageInstance().getByUUID(
      this.bean
    ) as IBean;
    if (bean) {
      if (bean.roastingDate) {
        const roastingDate = moment(bean.roastingDate);
        const brewTime = moment.unix(this.config.unix_timestamp);

        return brewTime.diff(roastingDate, 'days');
      }
    }

    return -1;
  }

  public getExtractionYield(): string {
    const grindWeight: number = this.grind_weight;
    const brewQuantity: number = this.brew_quantity;
    const brewBeverageQuantity: number = this.brew_beverage_quantity;
    const tds: number = this.tds;

    if (
      this.getPreparation().style_type ===
        PREPARATION_STYLE_TYPE.FULL_IMMERSION &&
      brewQuantity > 0
    ) {
      // #262
      // ey=(tds*total water)/dose
      return this.toFixedIfNecessary(
        (brewQuantity * tds) / grindWeight,
        2
      ).toString();
    }

    return this.toFixedIfNecessary(
      (brewBeverageQuantity * tds) / grindWeight,
      2
    ).toString();
  }

  private toFixedIfNecessary(value, dp) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  public getBrewRatio(): string {
    const grindWeight: number = this.grind_weight;
    let brewQuantity: number = 0;

    if (this.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
      brewQuantity = this.brew_quantity;
    } else {
      brewQuantity = this.brew_beverage_quantity;
    }
    let ratio: string = '1 / ';

    if (brewQuantity > 0 && grindWeight > 0) {
      ratio += (brewQuantity / grindWeight).toFixed(2);
    } else {
      ratio += '?';
    }

    return ratio;
  }

  public getGramsPerLiter() {
    const grindWeight: number = this.grind_weight;
    let brewQuantity: number = 0;

    if (this.getPreparation().style_type !== PREPARATION_STYLE_TYPE.ESPRESSO) {
      brewQuantity = this.brew_quantity;
    } else {
      brewQuantity = this.brew_beverage_quantity;
    }

    let ratio: string = '';

    if (brewQuantity > 0 && grindWeight > 0) {
      ratio =
        this.toFixedIfNecessary((grindWeight * 1000) / brewQuantity, 2) +
        ' g/l';
    } else {
      ratio = '? g/l';
    }

    return ratio;
  }

  public getPreparationToolName(_uuid: string): string {
    const tool: PreparationTool = this.getPreparation().tools.find(
      (e) => e.config.uuid === _uuid
    );
    if (tool) {
      return tool.name;
    }
    return '';
  }

  public formateDate(_format?: string): string {
    let format: string = 'DD.MM.YYYY, HH:mm:ss';
    if (_format) {
      format = _format;
    }

    return moment.unix(this.config.unix_timestamp).format(format);
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

  public getFormattedTotalCoffeeTemperatureTime(): string {
    const secs = this.brew_temperature_time;

    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    let formatted = '';
    if (millisecondsEnabled) {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.brew_temperature_time_milliseconds)
        .format('mm:ss' + this.getMillisecondsFormat());
    } else {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.brew_temperature_time_milliseconds)
        .format('mm:ss');
    }

    if (moment.utc(secs * 1000).hours() > 0) {
      if (millisecondsEnabled) {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.brew_temperature_time_milliseconds)
          .format('HH:mm:ss' + this.getMillisecondsFormat());
      } else {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.brew_temperature_time_milliseconds)
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

  /**
   * Return the caffeine amount in mg
   * https://coffee.stackexchange.com/a/324
   */
  public getCaffeineAmount(): number {
    return this.grind_weight * 0.008;
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

  private getBeanStorageInstance(): UIBeanStorage {
    let uiBeanStorage: UIBeanStorage;
    uiBeanStorage = UIBeanStorage.getInstance();

    return uiBeanStorage;
  }

  private getPreparationStorageInstance(): UIPreparationStorage {
    let uiPreparationStorage: UIPreparationStorage;
    uiPreparationStorage = UIPreparationStorage.getInstance();

    return uiPreparationStorage;
  }
  private getSettingsStorageInstance(): UISettingsStorage {
    let uiSettingsStorage: UISettingsStorage;
    uiSettingsStorage = UISettingsStorage.getInstance();

    return uiSettingsStorage;
  }
  private getMillStorageInstance(): UIMillStorage {
    let uiMillStorage: UIMillStorage;
    uiMillStorage = UIMillStorage.getInstance();

    return uiMillStorage;
  }

  private getWaterStorageInstance(): UIWaterStorage {
    let uiWaterStorage: UIWaterStorage;
    uiWaterStorage = UIWaterStorage.getInstance();

    return uiWaterStorage;
  }

  public getCoordinateMapLink(): string {
    if (this.coordinates && this.coordinates.latitude) {
      return `https://maps.google.com/?q=${this.coordinates.latitude},${this.coordinates.longitude}`;
    }
    return undefined;
  }

  public isArchived(): boolean {
    const bean: Bean = this.getBean();
    const mill: Mill = this.getMill();
    const preparation: Preparation = this.getPreparation();

    if (bean.finished || mill.finished || preparation.finished) {
      return true;
    }
    return false;
  }

  /**
   * Sorry for this, but angular hates inputs which are string and needs numbers
   */
  public fixDataTypes(): boolean {
    let fixNeeded: boolean = false;

    if (Number(this.brew_quantity) !== this.brew_quantity) {
      this.brew_quantity = Number(this.brew_quantity);
      fixNeeded = true;
    }

    if (Number(this.grind_weight) !== this.grind_weight) {
      this.grind_weight = Number(this.grind_weight);
      fixNeeded = true;
    }

    if (Number(this.mill_speed) !== this.mill_speed) {
      this.mill_speed = Number(this.mill_speed);
      fixNeeded = true;
    }

    if (Number(this.brew_temperature) !== this.brew_temperature) {
      this.brew_temperature = Number(this.brew_temperature);
      fixNeeded = true;
    }

    if (Number(this.brew_temperature_time) !== this.brew_temperature_time) {
      this.brew_temperature_time = Number(this.brew_temperature_time);
      fixNeeded = true;
    }
    if (Number(this.brew_time) !== this.brew_time) {
      this.brew_time = Number(this.brew_time);
      fixNeeded = true;
    }

    if (Number(this.brew_quantity) !== this.brew_quantity) {
      this.brew_quantity = Number(this.brew_quantity);
      fixNeeded = true;
    }

    if (Number(this.coffee_first_drip_time) !== this.coffee_first_drip_time) {
      this.coffee_first_drip_time = Number(this.coffee_first_drip_time);
      fixNeeded = true;
    }

    if (Number(this.coffee_blooming_time) !== this.coffee_blooming_time) {
      this.coffee_blooming_time = Number(this.coffee_blooming_time);
      fixNeeded = true;
    }

    return fixNeeded;
  }
}
