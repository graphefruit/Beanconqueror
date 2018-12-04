/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';

/**Enums**/
import {ROASTS_ENUM} from '../../enums/beans/roasts';

export interface IBean {
  name: string;
  roastingDate: string;
  note: string;
  filePath: string;
  roaster:string;
  roast:ROASTS_ENUM;
  config:IConfig;
}


