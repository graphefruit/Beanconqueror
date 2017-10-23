/**Interfaces**/
import {IBrew} from "../../interfaces/brew/iBrew";

/**Classes**/
import {Config} from "../objectConfig/objectConfig";

export class Brew implements IBrew {
  public title: string;
  public grindSize: string;
  public weight: number;
  public methodOfPreparation: string;
  public bean: string;
  public temperature: number;
  public brew_time: number;
  public brew_quantity:number;
  public note: string;
  public rating: number;
  public attachments: Array<string>;
  public config: Config;

  constructor() {
    this.title = "";
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

}
