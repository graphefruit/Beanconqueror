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
  public roaster:string;
  public config: Config;
  public roast:ROASTS_ENUM;
  public beanMix:string;
  public roast_custom:string;
  public aromatics:string;
  public weight:number;
  public finished:boolean;


  constructor() {
    this.name = "";
    this.roastingDate = "";
    this.note = "";
    this.filePath = "";
    this.roaster="";
    this.config = new Config();
    this.roast = <ROASTS_ENUM>"UNKNOWN";
    this.roast_custom ="";
    this.beanMix = "";
    this.aromatics = "";
    this.weight=0;
    this.finished = false;
  }

  public getRoastName():string{
    return ROASTS_ENUM[this.roast];
  }

  public initializeByObject(beanObj: IBean) {
    Object.assign(this, beanObj)
  }

}
