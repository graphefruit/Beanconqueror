import { PreparationDeviceType } from '../../classes/preparationDevice';
import { IXeniaParams } from '../preparationDevices/iXeniaParams';

export interface IPreparationDeviceBrew {
  type: PreparationDeviceType;
  params: any | IXeniaParams;
}
