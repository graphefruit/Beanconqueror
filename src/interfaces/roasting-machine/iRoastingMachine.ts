/**
 * Created by lars on 10/18/2017.
 */
import {IConfig} from '../objectConfig/iObjectConfig';
/** Enums */


export interface IRoastingMachine {
  name: string;

  note: string;
  finished: boolean;

  config: IConfig;
  attachments: Array<string>;
}
