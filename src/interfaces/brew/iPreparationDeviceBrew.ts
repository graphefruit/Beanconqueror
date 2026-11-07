import { PreparationDeviceType } from '../../classes/preparationDevice';
import { IGaggimateParams } from '../preparationDevices/gaggimate/iGaggimateParams';
import { IXeniaParams } from '../preparationDevices/iXeniaParams';
import { IMeticulousParams } from '../preparationDevices/meticulous/iMeticulousParams';
import { ISanremoYOUParams } from '../preparationDevices/sanremoYOU/iSanremoYOUParams';

export interface IPreparationDeviceBrew {
  type: PreparationDeviceType;
  params:
    | any
    | IXeniaParams
    | IMeticulousParams
    | ISanremoYOUParams
    | IGaggimateParams;
}
