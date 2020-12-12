/** Interfaces */
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
/** Classes */
/** Third party */
import moment from 'moment';
import {BREW_QUANTITY_TYPES_ENUM} from '../../enums/brews/brewQuantityTypes';
import {IMill} from '../../interfaces/mill/iMill';
/** Services */
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {Bean} from '../bean/bean';
import {Mill} from '../mill/mill';
import {Config} from '../objectConfig/objectConfig';
import {Preparation} from '../preparation/preparation';
import {ICupping} from '../../interfaces/cupping/iCupping';
import {IBrewCoordinates} from '../../interfaces/brew/iBrewCoordinates';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {PreparationTool} from '../preparation/preparationTool';

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
  // tslint:disable-next-line
  public brew_time: number;
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
  // tslint:disable-next-line
  public coffee_blooming_time: number;
  public attachments: Array<string>;
  public tds: number;

  public coordinates: IBrewCoordinates;


  public brew_beverage_quantity: number;

  public brew_beverage_quantity_type: BREW_QUANTITY_TYPES_ENUM;
  public config: Config;

  public cupping: ICupping;

  public method_of_preparation_tools: Array<string>;
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

    this.coordinates ={
       accuracy: null,
       altitude: null,
       altitudeAccuracy:null,
       heading:null,
       latitude: null,
       longitude: null,
       speed: null
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

    this.method_of_preparation_tools = [];

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
  }

  public getBrewQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_quantity_type];
  }
  public getBrewBeverageQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_beverage_quantity_type];
  }

  public getBean(): Bean {
    const iBean: IBean = this.getBeanStorageInstance()
      .getByUUID(this.bean) as IBean;
    const bean: Bean = new Bean();
    bean.initializeByObject(iBean);

    return bean;

  }

  public getPreparation(): Preparation {
    const iPreparation: IPreparation = this.getPreparationStorageInstance()
      .getByUUID(this.method_of_preparation) as IPreparation;
    const preparation: Preparation = new Preparation();
    preparation.initializeByObject(iPreparation);

    return preparation;

  }

  public getMill(): Mill {
    const iMill: IMill = this.getMillStorageInstance()
      .getByUUID(this.mill) as IMill;
    const mill: Mill = new Mill();
    mill.initializeByObject(iMill);

    return mill;

  }

  /**
   * Get the calculated bean age for this brew
   * If no age could be calculated it returns -1
   */
  public getCalculatedBeanAge(): number {

    const bean: IBean = this.getBeanStorageInstance()
      .getByUUID(this.bean) as IBean;
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
    const brewQuantity: number = this.brew_beverage_quantity;
    const tds: number = this.tds;


    return this.toFixedIfNecessary(((brewQuantity * tds) / grindWeight),2).toString();

  }

  private toFixedIfNecessary( value, dp ){
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed( dp );
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

  public getPreparationToolName(_uuid: string): string {
    const tool: PreparationTool = this.getPreparation().tools.find((e) => e.config.uuid === _uuid);
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

    return moment.unix(this.config.unix_timestamp)
      .format(format);
  }

  public getFormattedTotalCoffeeBrewTime(): string {
    const secs = this.brew_time;

    const formatted = moment.utc(secs * 1000).format('mm:ss');
    return formatted;
  }

  public getFormattedBrewTime(): string {
    const secs = this.brew_time;

    const formatted = moment.utc(secs * 1000).format('HH:mm:ss');
    return formatted;
  }

  public getFormattedCoffeeBrewTime(): string {
    const secs = this.brew_time;
    const start = moment().startOf('day').add('seconds',secs);
    if (this.coffee_first_drip_time > 0) {
      const diffing = moment().startOf('day').add('seconds',this.coffee_first_drip_time);
      if (this.coffee_first_drip_time > this.brew_time) {
        return ' - ' +  moment.utc(diffing.diff(start)).format('HH:mm:ss');
      } else {
        return moment.utc(start.diff(diffing)).format('HH:mm:ss');
      }
    } else {
      return start.format('HH:mm:ss');
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
  private getMillStorageInstance(): UIMillStorage  {
    let uiMillStorage: UIMillStorage;
    uiMillStorage = UIMillStorage.getInstance();

    return uiMillStorage;
  }
  
  public getCoordinateMapLink(): string {

    if (this.coordinates && this.coordinates.latitude) {
      return `https://maps.google.com/?q=${this.coordinates.latitude},${this.coordinates.longitude}`

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

    if (this.rating > 5) {
      this.rating = 5;
      fixNeeded = true;
    }


    return fixNeeded;
  }

}
