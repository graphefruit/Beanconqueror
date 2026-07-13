import { IMill } from '../../interfaces/mill/iMill';
import { Config } from '../objectConfig/objectConfig';

export class Mill implements IMill {
  public name: string;
  public note: string;
  public config: Config;
  public finished: boolean;
  public attachments: Array<string>;
  public has_adjustable_speed: boolean;
  public has_timer: boolean;

  constructor() {
    this.name = '';
    this.note = '';
    this.config = new Config();
    this.finished = false;
    this.attachments = [];
    // Defaults to true for backward compatibility — existing mills loaded
    // from storage without these fields keep the constructor default.
    this.has_adjustable_speed = true;
    this.has_timer = true;
  }

  public initializeByObject(millObj: IMill): void {
    Object.assign(this, millObj);
  }

  public hasPhotos(): boolean {
    return this.attachments && this.attachments.length > 0;
  }
}
