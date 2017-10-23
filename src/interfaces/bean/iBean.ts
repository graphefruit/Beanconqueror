/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
export interface IBean {
  name: string;
  roastingDate: string;
  note: string;
  filePath: string;
  config:IConfig;
}


