import {IConfig} from '../objectConfig/iObjectConfig';
import {ROAST_TYPE_ENUM} from '../../enums/beans/roast-type';


export interface IShoppingCart {
  name: string;
  roaster: string;
  description: string;
  note: string;
  source: string;
  roast_type: ROAST_TYPE_ENUM;
  config: IConfig;
  finished: boolean;
  weight: number;
  cost: number;
}
