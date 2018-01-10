/**Interfaces**/
import {IBean} from "../../interfaces/bean/iBean";
/**Classes**/
import {Config} from "../objectConfig/objectConfig";
/**Enums**/
import {ROASTS_ENUM} from '../../enums/beans/roasts';
export class Bean implements IBean {
  public name: string;
  public roastingDate: string;
  public note: string;
  public filePath: string;
  public config: Config;
  public roast:ROASTS_ENUM;

  constructor() {
    this.name = "";
    this.roastingDate = "";
    this.note = "";
    this.filePath = "";
    this.config = new Config();
    this.roast = <ROASTS_ENUM>"UNKNOWN";
  }

  public getRoastName():string{
    return ROASTS_ENUM[this.roast];
  }

  public initializeByObject(beanObj: IBean) {
    Object.assign(this, beanObj)
  }

}
