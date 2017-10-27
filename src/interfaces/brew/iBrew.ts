/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
export interface IBrew {
 //Properties
  grind_size:string,
  brew_weight:number,
  method_of_preparation:string,
  bean:string,
  brew_temperature:number,
  brew_time:number,
  brew_quantity:number,
  note:string,
  rating:number,
  attachments:Array<string>
  config:IConfig;

  //Functions
  formateDate():string;

}


