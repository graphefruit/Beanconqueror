/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
export interface IBrew {
  title: string,
  grindSize:string,
  weight:number,
  methodOfPreparation:string,
  bean:string,
  temperature:number,
  brew_time:number,
  brew_quantity:number,
  note:string,
  rating:number,
  attachments:Array<string>
  config:IConfig;
}


