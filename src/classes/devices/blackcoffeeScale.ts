import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;

/**
 * Provides BluetoothScale integration for Blackcoffee Scales.
 */
export class BlackcoffeeScale extends BluetoothScale {
  public static DEVICE_NAME = 'blackcoffee';
  public static DATA_SERVICE = '0000ffb0-0000-1000-8000-00805f9b34fb';
  public static DATA_CHARACTERISTIC = '0000ffb2-0000-1000-8000-00805f9b34fb';
  // Constructor

  // Class Members

  public override batteryLevel: number;
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };
  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('BlackCoffeeScale');
    this.supportsTaring = false;

    this.connect();
  }

  // Accessors

  /**
   * Checks if this class supports interaction with @param device.
   * @param device The device being checked for support.
   * @returns boolean If support is provided for device.
   */
  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toLowerCase().includes(this.DEVICE_NAME)
    );
  }

  public override getWeight() {
    return this.weight.actual;
  }

  public override getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public override getOldSmoothedWeight() {
    return this.weight.old;
  }

  // Public Methods

  public override async setTimer(command: SCALE_TIMER_COMMAND) {
    this.logger.log('The blackcoffee scale doesnt feature a timer');
  }

  public override async connect() {
    this.logger.log('Connecting...');

    await this.attachNotification();
  }

  /**
   * Tares the Blackcoffee Scale current weight to 0;
   */
  public override async tare() {
    this.logger.log('Taring is not possible with the blackcoffee scale');
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  // Private Methods

  private write(_bytes: number[]) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        BlackcoffeeScale.DATA_SERVICE,
        BlackcoffeeScale.DATA_CHARACTERISTIC,
        new Uint8Array(_bytes).buffer,
        (e: any) => {
          this.logger.debug('Write successfully');
          resolve(true);
        },
        (e: any) => {
          this.logger.debug('Write unsuccessfully');
          resolve(false);
        }
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      BlackcoffeeScale.DATA_SERVICE,
      BlackcoffeeScale.DATA_CHARACTERISTIC,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {}
    );
  }

  private parseStatusUpdate(BlackcoffeeRawStatus: Uint8Array) {
    if (BlackcoffeeRawStatus.length > 14) {
      const hex = Array.from(new Uint8Array(BlackcoffeeRawStatus.buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const isNegative = hex[4] == '8' || hex[4] == 'c';
      const isStill = hex[5] == '1';

      const hexWeight = hex.slice(7, 14);
      // weight is in gram
      const weight = ((isNegative ? -1 : 1) * parseInt(hexWeight, 16)) / 1000;
      this.setWeight(weight);
    } else {
      this.logger.log(
        'Bluetooth incoming statusUpdate is malformed, we should probably throw an error here...'
      );
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      BlackcoffeeScale.DATA_SERVICE,
      BlackcoffeeScale.DATA_CHARACTERISTIC,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
