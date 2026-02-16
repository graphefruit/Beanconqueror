import { IMill } from '../../interfaces/mill/iMill';
import { Config } from '../objectConfig/objectConfig';

export class Mill implements IMill {
  public name: string;
  public note: string;
  public config: Config;
  public finished: boolean;
  public attachments: Array<string>;

  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.finished = false;
    this.attachments = [];
  }

  public initializeByObject(millObj: IMill): void {
    Object.assign(this, millObj);
  }

  public hasPhotos(): boolean {
    return this.attachments && this.attachments.length > 0;
  }
}
