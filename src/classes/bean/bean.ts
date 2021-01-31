/** Interfaces */
import {BEAN_MIX_ENUM} from '../../enums/beans/mix';
/** Enums */
import {ROASTS_ENUM} from '../../enums/beans/roasts';
import {IBean} from '../../interfaces/bean/iBean';
/** Classes */
import {Config} from '../objectConfig/objectConfig';
import moment from 'moment';
import {BEAN_ROASTING_TYPE_ENUM} from '../../enums/beans/beanRoastingType';
import {IBeanInformation} from '../../interfaces/bean/iBeanInformation';
import {BeanRoastInformation} from './beanRoastInformation';

export class Bean implements IBean {
  public name: string;
  public roastingDate: string;
  public note: string;
  /** @deprecated use attachments instead */
  public filePath: string;
  public roaster: string;
  public config: Config;
  public roast: ROASTS_ENUM;
  public roast_range: number;
  public beanMix: BEAN_MIX_ENUM;

  // tslint:disable-next-line
  public roast_custom: string;
  public aromatics: string;
  public weight: number;
  public finished: boolean;
  public cost: number;
  public attachments: Array<string>;
  public cupping_points:string;
  public decaffeinated: boolean;
  public url: string;
  public ean_article_number: string;

  /** @deprecated */
  public variety: string;
  /** @deprecated */
  public processing: string;
  /** @deprecated */
  public country: string;

  public bean_information: Array<IBeanInformation>;

  public bean_roasting_type: BEAN_ROASTING_TYPE_ENUM;

  public bean_roast_information: BeanRoastInformation;

  constructor() {
    this.name = '';
    this.roastingDate = '';
    this.note = '';
    this.filePath = '';
    this.roaster = '';
    this.config = new Config();
    this.roast = 'UNKNOWN' as ROASTS_ENUM;
    this.roast_range = 0;
    this.roast_custom = '';
    this.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
    this.variety = '';
    this.processing = '';
    this.country = '';
    this.aromatics = '';
    this.weight = 0;
    this.finished = false;
    this.cost = 0;
    this.attachments = [];
    this.decaffeinated = false;
    this.cupping_points = '';
    this.bean_roasting_type = 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
    this.bean_information = [];
    this.url = '';
    this.ean_article_number = '';
    this.bean_roast_information = new BeanRoastInformation();
  }

  public getRoastName(): string {
    return ROASTS_ENUM[this.roast];
  }
  public getCustomRoastName(): string {
    if (this.roast === ROASTS_ENUM.CUSTOM_ROAST) {
      return this.roast_custom;
    }
    return '-';
  }

  public initializeByObject(beanObj: IBean): void {
    Object.assign(this, beanObj);

    this.bean_roast_information = new BeanRoastInformation();
    Object.assign(this.bean_roast_information, beanObj.bean_information);
  }

  public fixDataTypes(): boolean {
    let fixNeeded: boolean = false;


    if (Number(this.cost) !== this.cost) {
      this.cost = Number(this.cost);
      fixNeeded = true;
    }


    if (Number(this.weight) !== this.weight) {
      this.weight = Number(this.weight);
      fixNeeded = true;
    }


    return fixNeeded;
  }
  public beanAgeInDays(): number {
    const today = Date.now();
    let millisecondsSinceRoasting = today - Date.parse(this.roastingDate);
    if (isNaN(millisecondsSinceRoasting)) {
      millisecondsSinceRoasting = 0;
    }
    return Math.floor(millisecondsSinceRoasting / (1000 * 60 * 60 * 24));
  }

  /**
   * Get the calculated bean age for this brew
   */
  public getCalculatedBeanAge(): number {

    const roastingDate = moment(this.roastingDate);
    const brewTime = moment.unix(moment().unix());

    return brewTime.diff(roastingDate, 'days');
  }


}
