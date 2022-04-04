import { Platforms } from '@ionic/core';
import {PeripheralData} from './ble.types';
import {BluetoothScale, SCALE_TIMER_COMMAND, Weight} from './bluetoothDevice';
import { Logger } from './common/logger';
import { CMD_RESET_TIMER, CMD_START_TIMER, CMD_STOP_TIMER, CMD_TARE,
  DATA_CHARACTERISTIC, DATA_SERVICE, DEVICE_NAME, MAX_BATTERY_LEVEL, MIN_BATTERY_LEVEL,
  FELICITA_GRAM_UNIT, CMD_TOGGLE_UNIT, CMD_TOGGLE_PRECISION } from './felicita/constants';

declare var ble;

/**
 * Provides BluetoothScale integration for Felicita Scales.
 */
export default class FelicitaScale extends BluetoothScale {

  // Constructor

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);
    this.batteryLevel = 0;
    this.scaleUnit = FELICITA_GRAM_UNIT;
    this.logger = new Logger('FelicitaScale');

    this.connect();
  }

  // Accessors

  public getWeight() {
    return this.weight.actual;
  }

  public getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public getOldSmoothedWeight() {
    return this.weight.old;
  }

  public async setTimer(command: SCALE_TIMER_COMMAND) {
    this.logger.log("Setting Timer command " + command + "...");

    if (command === SCALE_TIMER_COMMAND.START) {
      await this.startTimer();
    } else if (command === SCALE_TIMER_COMMAND.STOP) {
      await this.stopTimer();
    } else {
      await this.resetTimer();
    }
  }

  // Public Methods

  public async connect() {
    this.logger.log("Connecting...");

    await this.attachNotification();
  }

  /**
   * Tares the Felicita Scale current weight to 0;
   */
  public async tare() {
    this.logger.log("Taring...");

    await this.write([CMD_TARE]);

    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;

    this.setWeight(0);
  }

  /**
   * Toggles the Felicita Scale Units between grams and ounces.
   */
  public async toggleUnit() {
    await this.write([CMD_TOGGLE_UNIT]);
  }

  /**
   * Toggles the Felicita Scale Precision between one and two decimal places.
   * Note: This likely depends if the Felicita Scale HW supports two decimal places, but my guess is that the BLE implementation is universal, the value at statusUpdate index 9 will not change.
   */
  public async togglePrecision() {
    await this.write([CMD_TOGGLE_PRECISION]);
  }

  /**
   * Checks if this class supports interaction with @param device.
   * @param device The device being checked for support.
   * @returns boolean If support is provided for device.
   */
  public static test(device): boolean {
    return device && device.name && [DEVICE_NAME].includes(device.name);
  }

  public disconnectTriggered(): void {
    this.logger.log("Disconnecting...");

    this.deattachNotification()
  }

  // Private Methods

  /**
   * Writes a @param _bytes payload to Felicita Scale via BLE.
   * @param _bytes the payload to be written.
   * @returns Asyncronous in nature, returns a callback.
   */
  private write(_bytes: number[]) {
    return new Promise((resolve, reject) => {
      ble.write(this.device_id,
        DATA_SERVICE,
        DATA_CHARACTERISTIC,
        new Uint8Array(_bytes).buffer,
        (e) => { resolve(true); },
        (e) => { resolve(false); });
    });
  }

  private async attachNotification() {
    ble.startNotification(this.device_id, DATA_SERVICE, DATA_CHARACTERISTIC,
      async (_data) => { this.parseStatusUpdate(new Uint8Array(_data)); }, (_data) => { }
    );
  }

  /**
   * Felicita Scales provide status updates via a 18 length unsigned integer array.
   * @param felicitaRawStatus The 18 length unsigned integer array retreived from BLE.
   */
  private parseStatusUpdate(felicitaRawStatus: Uint8Array) {

    this.logger.log("felicitaRawStatus received is: " + felicitaRawStatus);
    if (this.isValidFelicitaRawStatus(felicitaRawStatus)) {
      let weight = this.getWeightFromFelicitaRawStatus(felicitaRawStatus);
      this.setWeight(parseFloat(weight)/100);

      this.scaleUnit = this.getScaleUnitFromFelicitaRawStatus(felicitaRawStatus);

      this.batteryLevel = this.getBatteryPercentageFromFelicitaRawStatus(felicitaRawStatus);
    } else {
      this.logger.log("Bluetooth incoming statusUpdate is malformed, we should probably throw an error here...");
    }
  }

  private async startTimer() {
    this.write([CMD_START_TIMER])
  }

  private async resetTimer() {
    this.write([CMD_RESET_TIMER])
  }

  private async stopTimer() {
    this.write([CMD_STOP_TIMER])
  }

  /**
   * Gets battery percentage as a while integer number from 0-100.
   * @param felicitaRawStatus The 18 length unsigned integer array retreived from BLE.
   * @returns The integer battery percentage.
   */
  private getBatteryPercentageFromFelicitaRawStatus(felicitaRawStatus: Uint8Array) {
    let batteryLevelPercentage = Math.round((felicitaRawStatus[15] - MIN_BATTERY_LEVEL) / (MAX_BATTERY_LEVEL- MIN_BATTERY_LEVEL) * 100);

    this.logger.log("Battery level percentage is: " + batteryLevelPercentage);
    return batteryLevelPercentage;
  }

  private getScaleUnitFromFelicitaRawStatus(felicitaRawStatus: Uint8Array) {
    let scaleUnit = new TextDecoder().decode(felicitaRawStatus.slice(9,11));

    this.logger.log("Scale unit is: " + scaleUnit);
    return scaleUnit;
  }

  private getWeightFromFelicitaRawStatus(felicitaRawStatus) {
    let weight = felicitaRawStatus.slice(3,9).map((value) => { return value - 48; }).join('');

    this.logger.log("Weight is: " + weight);
    return weight;
  }

  private isValidFelicitaRawStatus(felicitaRawStatus: Uint8Array) {
    return felicitaRawStatus.length == 18 ? true : false;
  }

  private async deattachNotification() {
    ble.stopNotification(this.device_id, DATA_SERVICE, DATA_CHARACTERISTIC,
      (e) => {

      },
      (e) => {

      });
  }

  // Class Members

  private logger: Logger;

  public scaleUnit = FELICITA_GRAM_UNIT;

  public batteryLevel: number;

  protected weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };
}
