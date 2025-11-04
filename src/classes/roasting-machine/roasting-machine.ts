/** Interfaces */

/** Classes */
import {Config} from '../objectConfig/objectConfig';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';
import {ROASTER_MACHINE_TYPE} from '../../enums/roasting-machine/roasterMachineTypes';

export class RoastingMachine implements IRoastingMachine {
  public name: string;
  public note: string;
  public config: Config;
  public finished: boolean;
  public attachments: Array<string>;
  public type: ROASTER_MACHINE_TYPE;


  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.attachments = [];
    this.finished = false;
    this.type = ROASTER_MACHINE_TYPE.CUSTOM;
  }
  public initializeByObject(roastingMachineObj: IRoastingMachine): void {
    Object.assign(this, roastingMachineObj);
  }





}
