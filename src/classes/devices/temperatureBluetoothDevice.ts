import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';
import { Logger } from './common/logger';
import { to128bitUUID } from './common/util';

declare var ble: any;

export interface Temperature {
  actual: number;
  old: number;
}

export interface TemperatureChangeEvent extends Temperature {
  date: Date;
}

const UPDATE_EVERY_MS = 1000 / 10;

export abstract class TemperatureDevice {
  public static BATTERY_SERVICE_UUID = to128bitUUID('180F');
  public static BATTERY_CHAR_UUID = to128bitUUID('2A19');

  public device_id: string;
  public device_name: string;
  public batteryLevel: number;
  public temperatureChange: EventEmitter<TemperatureChangeEvent> =
    new EventEmitter();
  protected temperature: Temperature;
  protected temperatureParentLogger: Logger;

  private lastTemperatureSetTime: number = 0;

  protected constructor(data: PeripheralData) {
    this.device_id = data.id;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.temperature = {
      actual: 0,
      old: 0,
    };
    this.temperatureParentLogger = new Logger();
  }

  public abstract connect(): void;
  public abstract disconnect(): void;

  public getTemperature() {
    return this.temperature.actual;
  }

  public getOldTemperature() {
    return this.temperature.old;
  }

  /**
   * getBattery returns the battery level of the device
   *
   * @return a promise resolving to a number from 0 to 100 representing available battery percentage
   */
  public getBattery(): Promise<number> {
    return new Promise((resolve, reject) => {
      ble.read(
        this.device_id,
        TemperatureDevice.BATTERY_SERVICE_UUID,
        TemperatureDevice.BATTERY_CHAR_UUID,
        (buffer: ArrayBuffer) => {
          const data = new Uint8Array(buffer);
          resolve(data[0]);
        },
        (err: unknown) => {
          if (!(err instanceof Error)) {
            err = new Error(JSON.stringify(err));
          }
          reject(err);
        }
      );
    });
  }

  protected setTemperature(_newTemperature: number, _rawData: any) {
    if (Date.now() - this.lastTemperatureSetTime < UPDATE_EVERY_MS) {
      return;
    }
    this.lastTemperatureSetTime = Date.now();

    this.temperatureParentLogger.log(
      'Bluetooth Temperature Device - New temperature recieved ' +
        _newTemperature +
        ' - raw data ' +
        JSON.stringify(_rawData)
    );

    this.temperature.actual = _newTemperature;
    const actualDate = new Date();
    try {
      this.temperatureParentLogger.log(
        'Bluetooth Pressure Device - Are subscriptions existing? ' +
          this.temperatureChange?.observers?.length
      );
    } catch (ex) {}
    this.temperatureChange.emit({
      actual: this.temperature.actual,
      old: this.temperature.old,
      date: actualDate,
    });

    this.temperature.old = _newTemperature;
  }
}

export function fahrenheitToCelcius(temp: number) {
  return (temp - 32) * (5 / 9);
}

export function celciusToFahrenheit(temp: number) {
  return temp * (9 / 5) + 32;
}
