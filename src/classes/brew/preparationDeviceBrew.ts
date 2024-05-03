import { IPreparationDeviceBrew } from '../../interfaces/brew/iPreparationDeviceBrew';
import { PreparationDeviceType } from '../preparationDevice';
import { XeniaParams } from '../preparationDevice/xenia/xeniaDevice';
import { MeticulousParams } from '../preparationDevice/meticulous/meticulousDevice';

export class PreparationDeviceBrew implements IPreparationDeviceBrew {
  public type: PreparationDeviceType;
  public params: any | XeniaParams | MeticulousParams;

  constructor() {
    this.type = PreparationDeviceType.NONE;
    this.params = undefined;
  }
}
