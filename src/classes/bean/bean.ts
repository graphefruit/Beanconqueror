/** Interfaces */
import {BEAN_MIX_ENUM} from '../../enums/beans/mix';
/** Enums */
import {ROASTS_ENUM} from '../../enums/beans/roasts';
import {IBean} from '../../interfaces/bean/iBean';
/** Classes */
import {Config} from '../objectConfig/objectConfig';

export class Bean implements IBean {
  public name: string;
  public roastingDate: string;
  public note: string;
  /** @deprecated use attachments instead */
  public filePath: string;
  public roaster: string;
  public config: Config;
  public roast: ROASTS_ENUM;
  public beanMix: BEAN_MIX_ENUM;
  public variety: string;
  public country: string;
  // tslint:disable-next-line
  public roast_custom: string;
  public aromatics: string;
  public weight: number;
  public finished: boolean;
  public cost: number;
  public attachments: Array<string>;

  constructor() {
    this.name = '';
    this.roastingDate = '';
    this.note = '';
    this.filePath = '';
    this.roaster = '';
    this.config = new Config();
    this.roast = 'UNKNOWN' as ROASTS_ENUM;
    this.roast_custom = '';
    this.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
    this.variety = '';
    this.country = '';
    this.aromatics = '';
    this.weight = 0;
    this.finished = false;
    this.cost = 0;
    this.attachments = [];
  }

  public getRoastName(): string {
    return ROASTS_ENUM[this.roast];
  }

  public initializeByObject(beanObj: IBean): void {
    Object.assign(this, beanObj);
  }

  public beanAgeInDays(): number {
    const today = Date.now();
    let millisecondsSinceRoasting = today - Date.parse(this.roastingDate);
    if (isNaN(millisecondsSinceRoasting)) {
      millisecondsSinceRoasting = 0;
    }
    return Math.floor(millisecondsSinceRoasting / (1000 * 60 * 60 * 24));
  }

}
