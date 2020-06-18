/** Interfaces */
import {IMill} from '../../interfaces/mill/iMill';
/** Classes */
import {Config} from '../objectConfig/objectConfig';

export class Mill implements IMill {
  public name: string;
  public note: string;
  public config: Config;
  public finished: boolean;

  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.finished = false;

  }

  public initializeByObject(millObj: IMill): void {
    Object.assign(this, millObj);
  }

}
