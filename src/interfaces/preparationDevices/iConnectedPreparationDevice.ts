import { PreparationDeviceType } from '../../classes/preparationDevice';

export interface IConnectedPreparationDevice {
  type: PreparationDeviceType;
  url: string;
}
