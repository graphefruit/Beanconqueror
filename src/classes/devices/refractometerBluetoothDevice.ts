import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';
import { Logger } from './common/logger';
import { TEST_TYPE_ENUM } from 'src/enums/settings/refractometer';

export interface RefractometerReading {
  tds: number;
  temp: number;
}

export interface RefractionResultEvent extends RefractometerReading {
  date: Date;
}

declare var ble: any;
export abstract class RefractometerDevice {
  public device_id: string;
  public device_name: string;
  protected reading: RefractometerReading;
  public resultEvent: EventEmitter<RefractionResultEvent> = new EventEmitter();
  protected bluetoothParentLogger: Logger;
  protected TestType: TEST_TYPE_ENUM;

  constructor(data: PeripheralData) {
    this.device_id = data.id;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.reading = {
      tds: 0,
      temp: 0,
    };
    this.bluetoothParentLogger = new Logger();
  }

  public abstract connect(): void;
  public abstract disconnect(): void;

  public getLastReading(): RefractometerReading {
    return this.reading;
  }

  public abstract requestRead(): void;

  public getTestType(): TEST_TYPE_ENUM {
    return this.TestType;
  }

  /**
   * This is handled by each implementation of `RefractometerDevice`.
   *
   * Each device can implement one of the following:
   * - native functionality
   * - custom implementations not supported by hardware
   * - safe fallbacks if test types are not supported
   *
   * @param testType
   */
  public abstract setTestType(testType: TEST_TYPE_ENUM): void;

  /**
   * This is handled by each implementation of `RefractometerDevice`.
   *
   * Each device can implement one of the following:
   * - native functionality
   * - safe fallbacks if test types are not supported
   *
   * @param doAutoTest
   */
  public abstract setAutoTest(doAutoTest: boolean): void;

  /**
   * This is handled by each implementation of `RefractometerDevice`.
   *
   * Each device can implement one of the following:
   * - native functionality
   * - custom implementations not supported by hardware
   *
   * @param testType - each implementation should validate data is within range
   */
  public abstract setTestNumber(count: number): void;

  public disconnectTriggered(): void {}

  public setTdsReading(_tds: number) {
    this.bluetoothParentLogger.log(
      'Bluetooth Refractometer - New tds reading recieved ' + _tds,
    );
    this.reading.tds = _tds;
  }
  public setTempReading(_temp: number) {
    this.bluetoothParentLogger.log(
      'Bluetooth Refractometer - New temp reading recieved ',
    );
    this.reading.temp = _temp;
  }
}
