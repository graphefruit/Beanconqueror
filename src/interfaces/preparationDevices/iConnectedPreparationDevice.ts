import { PreparationDeviceType } from '../../classes/preparationDevice';

export interface IConnectedPreparationDevice {
  type: PreparationDeviceType;
  url: string;
  bluetoothId: string;
  bluetoothName: string;
  customParams: any;
}
