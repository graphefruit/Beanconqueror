import { PreparationDeviceType } from './index';
import { IConnectedPreparationDevice } from '../../interfaces/preparationDevices/iConnectedPreparationDevice';

export class ConnectedPreparationDevice implements IConnectedPreparationDevice {
  public type: PreparationDeviceType;
  public url: string;

  constructor() {
    this.type = PreparationDeviceType.NONE;
    this.url = '';
  }
}
