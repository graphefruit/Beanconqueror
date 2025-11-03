/**
 * Created by lars on 10/18/2017.
 */
import { IConfig } from '../objectConfig/iObjectConfig';
/** Enums */
import { ROASTING_MACHINE_TYPES } from 'src/enums/roasting-machine/roasting-machine-types';

export interface IRoastingMachine {
  name: string;
  type: ROASTING_MACHINE_TYPES;
  note: string;
  finished: boolean;

  config: IConfig;
  attachments: Array<string>;
}
