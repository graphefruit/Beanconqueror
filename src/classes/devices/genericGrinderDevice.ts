import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { Grinder, GrinderDevice } from './grinderBluetoothDevice';

export class GenericGrinderDevice extends GrinderDevice {
  public static DEVICE_NAME = 'grinder';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('GenericGrinderDevice');
    this.connect();
  }

  public static test(device: any): boolean {
    const deviceName = device?.name;
    const advertisedName = device?.advertising?.kCBAdvDataLocalName;

    return [deviceName, advertisedName].some((name) =>
      name?.toLowerCase().includes(GenericGrinderDevice.DEVICE_NAME),
    );
  }

  public connect(): void {
    this.logger.log('Generic grinder connected');
  }

  public disconnect(): void {
    this.logger.log('Generic grinder disconnected');
  }

  public updateGrinderAttributes(attributes: Partial<Grinder>): void {
    this.setGrinder(attributes, null);
  }
}
