/** Interfaces */
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {IPreparation} from '../../interfaces/preparation/iPreparation';
/** Classes */
/** Third party */
import * as moment from 'moment';
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
  public config: Config;

  public initializeByObject(brewObj: IBrew): void {
    Object.assign(this, brewObj);
  }

  constructor() {

    this.grind_size = '';
    this.grind_weight = 0;
    this.method_of_preparation = '';
    this.mill = '';
    this.mill_speed = 0;
    this.pressure_profile = '';
    this.bean = '';
    this.brew_temperature_time = 0;
    this.brew_temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.brew_quantity_type = 'GR' as BREW_QUANTITY_TYPES_ENUM;
    this.note = '';
    this.rating = 1;
    this.coffee_type = '';
    this.coffee_concentration = '';
    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;
    this.attachments = [];
    this.config = new Config();
  }

  public getBrewQuantityTypeName(): string {
    return BREW_QUANTITY_TYPES_ENUM[this.brew_quantity_type];
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
   */
  public getCalculatedBeanAge(): number {

    const bean: IBean = this.getBeanStorageInstance()
      .getByUUID(this.bean) as IBean;
    if (bean) {
      const roastingDate = moment(bean.roastingDate);
      const brewTime = moment.unix(this.config.unix_timestamp);

      return brewTime.diff(roastingDate, 'days');
    }

    return 0;
  }

  public getBrewRatio(): string {
    const grindWeight: number = this.grind_weight;
    const brewQuantity: number = this.brew_quantity;
    let ratio: string = '1 / ';

    if (brewQuantity > 0 && grindWeight > 0) {
      ratio += (brewQuantity / grindWeight).toFixed(2);
    } else {
      ratio += '?';
    }

    return ratio;

  }

  public formateDate(_format?: string): string {
    let format: string = 'DD.MM.YYYY, HH:mm:ss';
    if (_format) {
      format = _format;

    }

    return moment.unix(this.config.unix_timestamp)
      .format(format);
  }

  public getCalcualatedCoffeeBrewTime(): number {
    return this.brew_time - this.coffee_first_drip_time;
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

  /**
   * Sorry for this, but angular hates inputs which are string and needs numbers
   */
  public fixDataTypes() {
    this.brew_quantity = Number(this.brew_quantity);
    this.grind_weight = Number(this.grind_weight);
    // UUID

    // tslint:disable-next-line
    this.mill_speed = Number(this.mill_speed);

    // tslint:disable-next-line
    this.brew_temperature = Number(this.brew_temperature);
    // tslint:disable-next-line
    this.brew_temperature_time = Number(this.brew_temperature_time);
    // tslint:disable-next-line
    this.brew_time = Number(this.brew_time);
    // tslint:disable-next-line
    this.brew_quantity = Number(this.brew_quantity);
    // tslint:disable-next-line


    this.coffee_first_drip_time = Number(this.coffee_first_drip_time);
    // tslint:disable-next-line
    this.coffee_blooming_time = Number(this.coffee_blooming_time);
  }

}
