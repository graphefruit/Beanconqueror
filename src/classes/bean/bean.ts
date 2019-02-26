/**Interfaces**/
import {IBean} from "../../interfaces/bean/iBean";
/**Classes**/
import {Config} from "../objectConfig/objectConfig";
/**Enums**/
import {ROASTS_ENUM} from '../../enums/beans/roasts';
import {BEAN_MIX_ENUM} from "../../enums/beans/mix";
export class Bean implements IBean {
  public name: string;
  public roastingDate: string;
  public note: string;
  public filePath: string;
  public roaster:string;
  public config: Config;
  public roast:ROASTS_ENUM;
  public beanMix:BEAN_MIX_ENUM;
  public variety:string;
  public country:string;
  public roast_custom:string;
  public aromatics:string;
  public weight:number;
  public finished:boolean;
  public cost:number;

  constructor() {
    this.name = "";
    this.roastingDate = "";
    this.note = "";
    this.filePath = "";
    this.roaster="";
    this.config = new Config();
    this.roast = <ROASTS_ENUM>"UNKNOWN";
    this.roast_custom ="";
    this.beanMix = <BEAN_MIX_ENUM>"SINGLE_ORIGIN";
    this.variety ="";
    this.country ="";
    this.aromatics = "";
    this.weight=0;
    this.finished = false;
    this.cost=0;
  }

  public getRoastName():string{
    return ROASTS_ENUM[this.roast];
  }

  public initializeByObject(beanObj: IBean) {
    Object.assign(this, beanObj)
  }

}
