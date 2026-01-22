import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

const DEVICE_NAME = 'CFS-9002';
const DEVICE_NAME_SECOND = 'LSJ-001';

const DATA_SERVICE = 'FFF0';
const DATA_CHARACTERISTIC = 'FFF1';
const CMD_CHARACTERISTIC = 'FFF2';

const EURECA_PRECISA_GRAM_UNIT = 'g';
const EURECA_PRECISA_OUNCE_UNIT = 'oz';
const EURECA_PRECISA_MILLILITERS_UNIT = 'ml';

const CMD_HEADER = 0xaa;
const CMD_BASE = 0x02;
const CMD_START_TIMER = 0x33;
const CMD_STOP_TIMER = 0x34;
const CMD_RESET_TIMER = 0x35;
const CMD_TARE = 0x31;

const CMD_UNIT_BASE = 0x0336;
const CMD_UNIT_GRAM = 0x00;
const CMD_UNIT_OUNCE = 0x01;
const CMD_UNIT_ML = 0x02;

declare var ble: any;

/**
 * Provides BluetoothScale integration for EURECA PRECISA Scales.
 */
export class EurekaPrecisaScale extends BluetoothScale {
  // Constructor

  public scaleUnit = EURECA_PRECISA_GRAM_UNIT;

  // Accessors
  public override batteryLevel: number;
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };
  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.batteryLevel = 0;
    this.scaleUnit = EURECA_PRECISA_GRAM_UNIT;
    this.logger = new Logger('EurekaPrecisaScale');

    this.connect();
  }

  // Public Methods

  /**
   * Checks if this class supports interaction with @param device.
   * @param device The device being checked for support.
   * @returns boolean If support is provided for device.
   */
  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      ([DEVICE_NAME].includes(device.name) ||
        [DEVICE_NAME_SECOND].includes(device.name))
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

  // Private Methods

  public override async setTimer(command: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + command + '...');

    if (command === SCALE_TIMER_COMMAND.START) {
      await this.startTimer();
    } else if (command === SCALE_TIMER_COMMAND.STOP) {
      await this.stopTimer();
    } else {
      await this.resetTimer();
    }
  }

  public override async connect() {
    this.logger.log('Connecting...');

    await this.attachNotification();
  }

  /**
   * Tares the Scale current weight to 0;
   */
  public override async tare() {
    this.logger.log('Taring...');

    await this.write([CMD_HEADER, CMD_BASE, CMD_TARE, CMD_TARE]);

    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;

    this.setWeight(0);
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  /**
   * Writes a @param _bytes payload to Scale via BLE.
   * @param _bytes the payload to be written.
   * @returns Asyncronous in nature, returns a callback.
   */
  //TODO write without confirm!
  private write(_bytes: number[]) {
    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        DATA_SERVICE,
        CMD_CHARACTERISTIC,
        new Uint8Array(_bytes).buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      DATA_SERVICE,
      DATA_CHARACTERISTIC,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }

  /**
   * Eureka Scales provide status updates via a 11 length unsigned integer array.
   * @param scaleRawStatus The 11 length unsigned integer array retreived from BLE.
   */
  private parseStatusUpdate(scaleRawStatus: Uint8Array) {
    this.logger.log('scaleRawStatus received is: ' + scaleRawStatus);

    let is_neg = scaleRawStatus[6];
    let weight = (scaleRawStatus[8] << 8) + scaleRawStatus[7];

    weight = is_neg ? weight * -1 : weight;

    this.setWeight(weight / 10);
  }

  // Class Members

  private async startTimer() {
    this.write([CMD_HEADER, CMD_BASE, CMD_START_TIMER, CMD_START_TIMER]);
  }

  private async resetTimer() {
    this.write([CMD_HEADER, CMD_BASE, CMD_RESET_TIMER, CMD_RESET_TIMER]);
  }

  private async stopTimer() {
    this.write([CMD_HEADER, CMD_BASE, CMD_STOP_TIMER, CMD_STOP_TIMER]);
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      DATA_SERVICE,
      DATA_CHARACTERISTIC,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
