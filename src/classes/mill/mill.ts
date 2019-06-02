/** Interfaces */
import { IMill } from '../../interfaces/mill/iMill';
/** Classes */
import { Config } from '../objectConfig/objectConfig';
export class Mill implements IMill {
  public name: string;
  public note: string;
  public config: Config;

  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();

  }

  public initializeByObject(millObj: IMill): void {
    Object.assign(this, millObj);
  }

}
