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

export class Brew implements IBrew {
  public grind_size: string;
  public grind_weight: number;
  public method_of_preparation: string;
  public bean: string;
  public brew_temperature: number;
  public brew_time: number;
  public brew_quantity: number;
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
    this.bean = "";
    this.brew_temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.note = "";
    this.rating = 1;
    this.coffee_type = "";
    this.coffee_concentration = "";
    this.coffee_first_drip_time = 0;
    this.coffee_blooming_time = 0;
    this.attachments = [];
    this.config = new Config();
  }

  private getBeanStorageInstance():UIBeanStorage{
    let uiBeanStorage: UIBeanStorage;
    uiBeanStorage = <UIBeanStorage>UIBeanStorage.getInstance();
    return uiBeanStorage;
  }

  private getPreparationStorageInstance():UIPreparationStorage{
    let uiPreparationStorage: UIPreparationStorage;
    uiPreparationStorage = <UIPreparationStorage>UIPreparationStorage.getInstance();
    return uiPreparationStorage;
  }

  public getBean():Bean{
    let iBean: IBean = <IBean>this.getBeanStorageInstance().getByUUID(this.bean);
    let bean:Bean = new Bean();
    bean.initializeByObject(iBean);

    return bean;

  }

  public getPreparation():Preparation{
    let iPreparation: IPreparation = <IPreparation>this.getPreparationStorageInstance().getByUUID(this.method_of_preparation);
    let preparation:Preparation = new Preparation();
    preparation.initializeByObject(iPreparation);

    return preparation;

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

  public formateDate(_format?: string): string {
    let format: string = "DD.MM.YYYY, HH:mm:ss";
    if (_format) {
      format = _format;

    }
    return moment.unix(this.config.unix_timestamp).format(format);
  }

}
