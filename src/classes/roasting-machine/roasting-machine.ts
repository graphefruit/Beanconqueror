/** Interfaces */

/** Classes */
import { Config } from '../objectConfig/objectConfig';
import { IRoastingMachine } from '../../interfaces/roasting-machine/iRoastingMachine';

import { ROASTING_MACHINE_TYPES } from 'src/enums/roasting-machine/roasting-machine-types';

export class RoastingMachine implements IRoastingMachine {
  public name: string;
  public note: string;
  public type: ROASTING_MACHINE_TYPES;
  public config: Config;
  public finished: boolean;
  public attachments: Array<string>;

  constructor() {
    this.name = '';
    this.note = '';
    this.type = ROASTING_MACHINE_TYPES.CUSTOM;
    this.config = new Config();
    this.attachments = [];
    this.finished = false;
  }
  public initializeByObject(roastingMachineObj: IRoastingMachine): void {
    Object.assign(this, roastingMachineObj);
  }
}
