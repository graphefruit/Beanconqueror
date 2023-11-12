import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;

/**
 * Provides BluetoothScale integration for Smartchef Scales.
 */
export class SmartchefScale extends BluetoothScale {
  public static DEVICE_NAME = 'smartchef';
  public static DATA_SERVICE = 'FFF0';
  public static DATA_CHARACTERISTIC = 'FFF1';
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
    this.logger = new Logger('SmartchefScale');
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
    this.logger.log('The smartchef scale doesnt feature a timer');
  }

  public override async connect() {
    this.logger.log('Connecting...');

    await this.attachNotification();
  }

  /**
   * Tares the Smartchef Scale current weight to 0;
   */
  public override async tare() {
    this.logger.log('Taring is not possible with the smartchef scale');
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  // Private Methods

  /**
   * Writes a @param _bytes payload to Smartchef Scale via BLE.
   * @param _bytes the payload to be written.
   * @returns Asyncronous in nature, returns a callback.
   */
  private write(_bytes: number[]) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        SmartchefScale.DATA_SERVICE,
        SmartchefScale.DATA_CHARACTERISTIC,
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
      SmartchefScale.DATA_SERVICE,
      SmartchefScale.DATA_CHARACTERISTIC,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {}
    );
  }

  /**
   * Smartchef Scales provide status updates via a 18 length unsigned integer array.
   * @param SmartchefRawStatus The 18 length unsigned integer array retreived from BLE.
   */
  private parseStatusUpdate(smartChefRawStatus: Uint8Array) {
    if (smartChefRawStatus.length > 8) {
      let weight = ((smartChefRawStatus[5] << 8) + smartChefRawStatus[6]) / 10;
      if (smartChefRawStatus[3] > 10) {
        weight = weight * -1;
      }
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
      SmartchefScale.DATA_SERVICE,
      SmartchefScale.DATA_CHARACTERISTIC,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
