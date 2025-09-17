import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';
import { Logger } from './common/logger';
import { to128bitUUID } from './common/util';

declare var ble: any;

export enum TemperatureSource {
  SET_POINT = 'SetPoint', // set point or goal for the shot
  WATER_PROBE = 'WaterProbe', // last measured water temp before group (mix)
  BASKET_PROBE = 'BasketProbe', // measured temp at group/basket, may or may not be in water path
}

export interface Temperature {
  actual: number;
  old: number;
  source: TemperatureSource;
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
  protected temperatures = new Map<TemperatureSource, number>();
  protected temperatureParentLogger: Logger;
  private defaultTemperatureSource;
  private lastTemperatureSetTime: number = 0;

  protected constructor(
    data: PeripheralData,
    defaultTemperatureSource: TemperatureSource = TemperatureSource.WATER_PROBE,
  ) {
    this.device_id = data.id;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.temperatureParentLogger = new Logger();
    this.defaultTemperatureSource = defaultTemperatureSource;
  }

  public abstract connect(): void;
  public abstract disconnect(): void;

  public getDefaultTempeatureSource() {
    return TemperatureSource.WATER_PROBE;
  }

  public getTemperature(
    _source: TemperatureSource = this.defaultTemperatureSource,
  ) {
    return this.dataFor(_source).actual;
  }

  public getOldTemperature(
    _source: TemperatureSource = this.defaultTemperatureSource,
  ) {
    return this.dataFor(_source).old;
  }

  private dataFor(_source: TemperatureSource) {
    return (this.temperatures[_source] ??= {
      actual: 0,
      old: 0,
      source: _source,
      lastSetTime: 0,
    });
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
        },
      );
    });
  }
  protected setTemperature(
    _newTemperature: number,
    _rawData: any,
    _source: TemperatureSource = this.defaultTemperatureSource,
  ) {
    const temperatureData = this.dataFor(_source);
    if (Date.now() - temperatureData.lastSetTime < UPDATE_EVERY_MS) {
      return;
    }
    temperatureData.lastSetTime = Date.now();

    this.temperatureParentLogger.log(
      'Bluetooth Temperature Device - New temperature recieved ' +
        _newTemperature +
        '- source ' +
        _source +
        ' - raw data ' +
        JSON.stringify(_rawData),
    );

    temperatureData.actual = _newTemperature;
    const actualDate = new Date();
    try {
      this.temperatureParentLogger.log(
        'Bluetooth Temperature Device - Are subscriptions existing? ' +
          this.temperatureChange?.observers?.length,
      );
    } catch (ex) {}
    this.temperatureChange.emit({
      actual: temperatureData.actual,
      old: temperatureData.old,
      date: actualDate,
      source: temperatureData.source,
    });

    temperatureData.old = _newTemperature;
  }
}

export function fahrenheitToCelcius(temp: number) {
  return (temp - 32) * (5 / 9);
}

export function celciusToFahrenheit(temp: number) {
  return temp * (9 / 5) + 32;
}
