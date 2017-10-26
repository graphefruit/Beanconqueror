/**Interfaces**/
import {IBean} from "../../interfaces/bean/iBean";
/**Classes**/
import {Config} from "../objectConfig/objectConfig";

export class Bean implements IBean {
  public name: string;
  public roastingDate: string;
  public note: string;
  public filePath: string;
  public config: Config;

  constructor() {
    this.name = "";
    this.roastingDate = "";
    this.note = "";
    this.filePath = "";
    this.config = new Config();
  }

  public initializeByObject(beanObj: IBean) {
    Object.assign(this, beanObj)
  }

}
