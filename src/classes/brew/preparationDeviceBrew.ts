import { IPreparationDeviceBrew } from '../../interfaces/brew/iPreparationDeviceBrew';
import { PreparationDeviceType } from '../preparationDevice';
import { XeniaParams } from '../preparationDevice/xenia/xeniaDevice';

export class PreparationDeviceBrew implements IPreparationDeviceBrew {
  public type: PreparationDeviceType;
  public params: any | XeniaParams;

  constructor() {
    this.type = PreparationDeviceType.NONE;
    this.params = undefined;
  }
}
