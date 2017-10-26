
/**Interfaces**/
import {IBrew} from "../../interfaces/brew/iBrew";

/**Classes**/
import {Config} from "../objectConfig/objectConfig";
/**Third party**/
import moment from 'moment';
export class Brew implements IBrew {
  public grindSize: string;
  public weight: number;
  public methodOfPreparation: string;
  public bean: string;
  public temperature: number;
  public brew_time: number;
  public brew_quantity: number;
  public note: string;
  public rating: number;
  public attachments: Array<string>;
  public config: Config;


  public initializeByObject(brewObj: IBrew) {
    Object.assign(this, brewObj)
  }

  constructor() {
    this.grindSize = "";
    this.weight = 0;
    this.methodOfPreparation = "";
    this.bean = "";
    this.temperature = 0;
    this.brew_time = 0;
    this.brew_quantity = 0;
    this.note = "";
    this.rating = 0;
    this.attachments = [];
    this.config = new Config();


  }

  public formateDate(_format?:string):string{
    let format:string = "DD.MM.YYYY, HH:mm:ss";
    if (_format){
      format = _format;

    }
    return moment.unix(this.config.unix_timestamp).format(format);
  }

}
