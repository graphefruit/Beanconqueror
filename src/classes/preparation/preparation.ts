/** Interfaces */
import {IPreparation} from '../../interfaces/preparation/iPreparation';
/** Classes */
import {Config} from '../objectConfig/objectConfig';
import {PREPARATION_TYPES} from '../../enums/preparations/preparationTypes';


export class Preparation implements IPreparation {
  public name: string;
  public note: string;
  public config: Config;
  public type: PREPARATION_TYPES;
  public finished: boolean;
  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.type = 'CUSTOM_PREPARATION' as PREPARATION_TYPES;
    this.finished = false;
  }

  public initializeByObject (preparationObj: IPreparation): void {
    Object.assign(this, preparationObj);
  }

}
