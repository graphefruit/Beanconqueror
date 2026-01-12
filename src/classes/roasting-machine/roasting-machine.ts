
import {Config} from '../objectConfig/objectConfig';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';

export class RoastingMachine implements IRoastingMachine {
  public name: string;
  public note: string;
  public config: Config;
  public finished: boolean;
  public attachments: Array<string>;


  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.attachments = [];
    this.finished = false;
  }
  public initializeByObject(roastingMachineObj: IRoastingMachine): void {
    Object.assign(this, roastingMachineObj);
  }





}
