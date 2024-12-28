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
import { ICustomInformationBrew } from '../../interfaces/brew/ICustomInformationBrew';
import { CustomInformationBrew } from './customInformationBrew';
import { IReferenceGraph } from '../../interfaces/brew/iReferenceGraph';
import { ReferenceGraph } from './referenceGraph';
import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import { BREW_GRAPH_TYPE } from '../../enums/brews/brewGraphType';
export class BrewInstanceHelper {
  constructor() {}

  public static preparations: any = {};
  public static mills: any = {};
  public static beans: any = {};
  public static waters: any = {};

  public static setEntryAmountBackToZero() {
    this.preparations = {};
    this.mills = {};
    this.beans = {};
    this.waters = {};
  }
}
export class Brew implements IBrew {
  public grind_size: string;
  public grind_weight: number;
  // UUID
  public method_of_preparation: string;
  // UUID
  public mill: string;
  public mill_speed: number;
  public mill_timer: number;
  public mill_timer_milliseconds: number;
  public pressure_profile: string;
  // UUID
  public bean: string;
  public brew_temperature: number;
  public brew_temperature_time: number;

  public brew_temperature_time_milliseconds: number;

  public brew_time: number;
  public brew_time_milliseconds: number;
  public brew_quantity: number;
  public brew_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public note: string;
  public rating: number;
  public coffee_type: string;
  public coffee_concentration: string;
  public coffee_first_drip_time: number;
  public coffee_first_drip_time_milliseconds: number;
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

  public best_brew: boolean;

  // Inherits the saved json path
  public flow_profile: string;

  // Inherits the referenced saved json path
  public reference_flow_profile: IReferenceGraph;

  public preparationDeviceBrew: IPreparationDeviceBrew;
  public customInformation: ICustomInformationBrew;
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

    this.mill_timer_milliseconds = 0;
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
    this.best_brew = false;
    this.water = '';
    this.vessel_name = '';
    this.vessel_weight = 0;

    this.flow_profile = '';
    this.reference_flow_profile = new ReferenceGraph();

    this.preparationDeviceBrew = new PreparationDeviceBrew();
    this.customInformation = new CustomInformationBrew();
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
    const uniqueCachingID = this.config.uuid + '-' + this.bean;
    if (
      BrewInstanceHelper.beans[uniqueCachingID] === undefined ||
      BrewInstanceHelper.beans[uniqueCachingID].config.uuid !== this.bean
    ) {
      const iBean: IBean = this.getBeanStorageInstance().getByUUID(
        this.bean
      ) as IBean;
      const bean: Bean = new Bean();
      bean.initializeByObject(iBean);
      BrewInstanceHelper.beans[uniqueCachingID] = bean;
    }
    return BrewInstanceHelper.beans[uniqueCachingID];
  }

  /**We do this, else we get called all day and have performance downtimes **/

  public getPreparation(): Preparation {
    const uniqueCachingID = this.config.uuid + '-' + this.method_of_preparation;
    if (
      BrewInstanceHelper.preparations[uniqueCachingID] === undefined ||
      BrewInstanceHelper.preparations[uniqueCachingID].config.uuid !==
        this.method_of_preparation
    ) {
      const iPreparation: IPreparation =
        this.getPreparationStorageInstance().getByUUID(
          this.method_of_preparation
        ) as IPreparation;
      const preparation: Preparation = new Preparation();
      preparation.initializeByObject(iPreparation);

      BrewInstanceHelper.preparations[uniqueCachingID] = preparation;
    }

    return BrewInstanceHelper.preparations[uniqueCachingID];
  }

  public getMill(): Mill {
    const uniqueCachingID = this.config.uuid + '-' + this.mill;
    if (
      BrewInstanceHelper.mills[uniqueCachingID] === undefined ||
      BrewInstanceHelper.mills[uniqueCachingID].config.uuid !== this.mill
    ) {
      const iMill: IMill = this.getMillStorageInstance().getByUUID(
        this.mill
      ) as IMill;
      const mill: Mill = new Mill();
      mill.initializeByObject(iMill);
      BrewInstanceHelper.mills[uniqueCachingID] = mill;
    }
    return BrewInstanceHelper.mills[uniqueCachingID];
  }

  public getWater(): Water {
    const uniqueCachingID = this.config.uuid + '-' + this.water;
    if (
      BrewInstanceHelper.waters[uniqueCachingID] === undefined ||
      BrewInstanceHelper.waters[uniqueCachingID].config.uuid !== this.water
    ) {
      const iWater: IWater = this.getWaterStorageInstance().getByUUID(
        this.water
      ) as IWater;
      const water: Water = new Water();
      water.initializeByObject(iWater);
      BrewInstanceHelper.waters[uniqueCachingID] = water;
    }

    return BrewInstanceHelper.waters[uniqueCachingID];
  }

  /**
   * Get the calculated bean age for this brew
   * If no age could be calculated it returns -1
   */
  public getCalculatedBeanAge(): number {
    const bean: Bean = this.getBean();
    if (bean) {
      if (bean.roastingDate) {
        const roastingDate = moment(bean.roastingDate).startOf('day');
        const brewTime = moment.unix(this.config.unix_timestamp).startOf('day');

        let hasFrozenDate: boolean = false;
        if (bean.frozenDate) {
          hasFrozenDate = true;
        }
        let hasUnFrozenDate: boolean = false;
        if (bean.unfrozenDate) {
          hasUnFrozenDate = true;
        }

        if (hasFrozenDate === false) {
          // Normal calculcation as always
          return brewTime.diff(roastingDate, 'days');
        } else {
          // Something has been frozen, now its going down to the deep :)
          let normalDaysToAdd: number = 0;
          const frozenDate = moment(bean.frozenDate).startOf('day');

          const frozenDateDiff: number = frozenDate.diff(roastingDate, 'days');
          // We add now the time between roasting and the first freezing.
          normalDaysToAdd = normalDaysToAdd + frozenDateDiff;

          if (hasUnFrozenDate) {
            /**
             * We did unfreeze the bean and maybe it was still there one day or more.
             * We calculate now the unfreeze - freeze date and take into account that 90 days of freezing is one real day time.
             */
            const unfrozenDate = moment(bean.unfrozenDate).startOf('day');
            const freezingPeriodTime = unfrozenDate.diff(frozenDate, 'days');
            const priorToNormalDays = Math.floor(freezingPeriodTime / 90);
            normalDaysToAdd = normalDaysToAdd + priorToNormalDays;

            /**
             * After we've calculcated the time in between we check how much time has been gone after unfreezing
             */
            const diffOfBrewTime = brewTime.diff(unfrozenDate, 'days');
            normalDaysToAdd = normalDaysToAdd + diffOfBrewTime;
          } else {
            /** We didn't unfreeze the bean, and the bean was directly used.
             * So the beans where actually taken directly in frozen state.
             */
            const diffOfBrewTime = brewTime.diff(frozenDate, 'days');
            const priorToNormalDays = Math.floor(diffOfBrewTime / 90);
            normalDaysToAdd = normalDaysToAdd + priorToNormalDays;
          }
          return normalDaysToAdd;
        }
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
    const settingsDateFormat: string =
      this.getSettingsStorageInstance().getSettings().date_format;
    let format: string = settingsDateFormat + ', HH:mm:ss';
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

  public getFormattedTotalMillTimerTime(): string {
    const secs = this.mill_timer;

    const millisecondsEnabled: boolean =
      this.getSettingsStorageInstance().getSettings().brew_milliseconds;
    let formatted = '';
    if (millisecondsEnabled) {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.mill_timer_milliseconds)
        .format('mm:ss' + this.getMillisecondsFormat());
    } else {
      formatted = moment
        .utc(secs * 1000)
        .add('milliseconds', this.mill_timer_milliseconds)
        .format('mm:ss');
    }

    if (moment.utc(secs * 1000).hours() > 0) {
      if (millisecondsEnabled) {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.mill_timer_milliseconds)
          .format('HH:mm:ss' + this.getMillisecondsFormat());
      } else {
        formatted = moment
          .utc(secs * 1000)
          .add('milliseconds', this.mill_timer_milliseconds)
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

  public getGraphPath(_type: BREW_GRAPH_TYPE = BREW_GRAPH_TYPE.BREW) {
    if (_type === BREW_GRAPH_TYPE.BREW) {
      return 'brews/' + this.config.uuid + '_flow_profile.json';
    } else if (_type === BREW_GRAPH_TYPE.IMPORTED_GRAPH) {
      if (
        this.reference_flow_profile?.type ===
        REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
      ) {
        return 'importedGraph/' + this.config.uuid + '_flow_profile.json';
      }
    }
    return '';
  }

  public getBeanAgeByBrewDate() {
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
}
