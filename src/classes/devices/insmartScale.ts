import { BluetoothScale } from './bluetoothDevice';
import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

declare var ble: any;

export class InsmartScale extends BluetoothScale {
  public static SERVICE_UUID = 'fff0';
  public static WEIGHT_CHAR_UUID = 'fff3';

  private logger: Logger;

  constructor(data: PeripheralData, type: any) {
    super(data, type);
    this.logger = new Logger('InsmartScale');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      (device.name.toLowerCase().includes('863a') ||
        device.name.toLowerCase().includes('insmart'))
    );
  }

  public async connect() {
    this.attachNotification();
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      InsmartScale.SERVICE_UUID,
      InsmartScale.WEIGHT_CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {
        this.logger.error('Failed to subscribe to 0xFFF3 notifications');
      }
    );
  }

  private parseStatusUpdate(data: Uint8Array) {
    if (data.length >= 6) {
      const isNegative = (data[2] & 0x10) !== 0;
      const rawWeight = data[4] | (data[5] << 8);
      const weightInGrams = (isNegative ? -rawWeight : rawWeight) / 10;

      this.setWeight(weightInGrams);
    }
  }

  public async tare() {
    this.setWeight(0);
  }

  public async disconnectTriggered(): Promise<void> {
    ble.stopNotification(
      this.device_id,
      InsmartScale.SERVICE_UUID,
      InsmartScale.WEIGHT_CHAR_UUID
    );
  }
}