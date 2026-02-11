import { IPreparationDeviceBrew } from '../../interfaces/brew/iPreparationDeviceBrew';
import { PreparationDeviceType } from '../preparationDevice';
import { MeticulousParams } from '../preparationDevice/meticulous/meticulousDevice';
import { XeniaParams } from '../preparationDevice/xenia/xeniaDevice';

export class PreparationDeviceBrew implements IPreparationDeviceBrew {
  public type: PreparationDeviceType;
  public params: any | XeniaParams | MeticulousParams;

  constructor() {
    this.type = PreparationDeviceType.NONE;
    this.params = undefined;
  }
}
