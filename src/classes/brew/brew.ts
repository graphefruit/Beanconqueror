/**Interfaces**/
import {IBrew} from "../../interfaces/brew/iBrew";
import {IBean} from "../../interfaces/bean/iBean";
import {IPreparation} from "../../interfaces/preparation/iPreparation";

/**Classes**/
import {Config} from "../objectConfig/objectConfig";
import {Bean} from "../bean/bean";
import {Preparation} from "../preparation/preparation";
/**Third party**/
import moment from 'moment';
/**Services**/
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {BREW_QUANTITY_TYPES_ENUM} from "../../enums/brews/brewQuantityTypes";
import {UIMillStorage} from "../../services/uiMillStorage";
import {Mill} from "../mill/mill";
import {IMill} from "../../interfaces/mill/iMill";


export class Brew implements IBrew {
  public grind_size: string;
  public grind_weight: number;
  //UUID
  public method_of_preparation: string;
  //UUID
  public mill:string;

  public mill_speed:number;
  public pressure_profile:string;
  //UUID
  public bean: string;
  public brew_temperature: number;
  public brew_temperature_time:number;
  public brew_time: number;
  public brew_quantity: number;
  public brew_quantity_type:BREW_QUANTITY_TYPES_ENUM;
  public note: string;
  public rating: number;
  public coffee_type: string;
  public coffee_concentration: string;
  public coffee_first_drip_time: number;
  public coffee_blooming_time: number;
  public attachments: Array<string>;
  public config: Config;


  public initializeByObject(brewObj: IBrew) {
    Object.assign(this, brewObj);
  }

  constructor() {

    this.grind_size = "";
    this.grind_weight = 0;
    this.method_of_preparation = "";
    this.mill = "";
    this.mill_speed = 0;
    this.pressure_profile = "";
    this.bean = "";
    this.brew_temperature_time = 0;
    this.brew_temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.brew_quantity_type = <BREW_QUANTITY_TYPES_ENUM>"GR";
    this.note = "";
    this.rating = 1;
    this.coffee_type = "";
    this.coffee_concentration = "";
    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;
    this.attachments = [];
    this.config = new Config();
  }

  private getBeanStorageInstance(): UIBeanStorage {
    let uiBeanStorage: UIBeanStorage;
    uiBeanStorage = <UIBeanStorage>UIBeanStorage.getInstance();
    return uiBeanStorage;
  }

  private getPreparationStorageInstance(): UIPreparationStorage {
    let uiPreparationStorage: UIPreparationStorage;
    uiPreparationStorage = <UIPreparationStorage>UIPreparationStorage.getInstance();
    return uiPreparationStorage;
  }
  private getMillStorageInstance():UIMillStorage  {
    let uiMillStorage: UIMillStorage;
    uiMillStorage = <UIMillStorage>UIMillStorage.getInstance();
    return uiMillStorage;
  }

  public getBrewQuantityTypeName():string{
    return BREW_QUANTITY_TYPES_ENUM[this.brew_quantity_type];
  }

  public getBean(): Bean {
    let iBean: IBean = <IBean>this.getBeanStorageInstance().getByUUID(this.bean);
    let bean: Bean = new Bean();
    bean.initializeByObject(iBean);

    return bean;

  }

  public getPreparation(): Preparation {
    let iPreparation: IPreparation = <IPreparation>this.getPreparationStorageInstance().getByUUID(this.method_of_preparation);
    let preparation: Preparation = new Preparation();
    preparation.initializeByObject(iPreparation);

    return preparation;

  }

  public getMill(): Mill {
    let iMill: IMill = <IMill>this.getMillStorageInstance().getByUUID(this.mill);
    let mill: Mill = new Mill();
    mill.initializeByObject(iMill);

    return mill;

  }

  /**
   * Get the calculated bean age for this brew
   */
  public getCalculatedBeanAge(): number {

    let bean: IBean = <IBean>this.getBeanStorageInstance().getByUUID(this.bean);
    if (bean) {
      let roastingDate = moment(bean.roastingDate);
      let brewTime = moment.unix(this.config.unix_timestamp);
      return brewTime.diff(roastingDate, 'days');
    }
    return 0;
  }


  public getBrewRatio(): string {
    let grindWeight: number = this.grind_weight;
    let brewQuantity: number = this.brew_quantity;
    let ratio: string = "1 / ";

    if (brewQuantity>0 && grindWeight > 0){
      ratio +=(brewQuantity / grindWeight).toFixed(2);
    }
    else
    {
      ratio +="?";
    }

    return ratio;

  }

  public formateDate(_format?: string): string {
    let format: string = "DD.MM.YYYY, HH:mm:ss";
    if (_format) {
      format = _format;

    }
    return moment.unix(this.config.unix_timestamp).format(format);
  }

}
