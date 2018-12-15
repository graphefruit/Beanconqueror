/**Interfaces**/
import {IPreparation} from "../../interfaces/preparation/iPreparation";
/**Classes**/
import {Config} from "../objectConfig/objectConfig";

export class Preparation implements IPreparation {
  public name: string;
  public note: string;
  public config: Config;

  constructor() {
    this.name = "";
    this.note = "";
    this.config = new Config();
  }

  public initializeByObject(preparationObj: IPreparation) {
    Object.assign(this, preparationObj)
  }


}
