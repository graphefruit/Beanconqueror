import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';
import { Logger } from './common/logger';
import { to128bitUUID } from './common/util';

declare var ble: any;

export interface Pressure {
  actual: number;
  old: number;
}

export interface PressureChangeEvent extends Pressure {
  date: Date;
}

const UPDATE_EVERY_MS = 1000 / 10;

export abstract class PressureDevice {
  public static BATTERY_SERVICE_UUID = to128bitUUID('180F');
  public static BATTERY_CHAR_UUID = to128bitUUID('2A19');

  public device_id: string;
  public device_name: string;
  public batteryLevel: number;
  public pressureChange: EventEmitter<PressureChangeEvent> = new EventEmitter();
  protected pressure: Pressure;
  protected pressureParentLogger: Logger;

  private lastPressureSetTime: number = 0;

  protected constructor(data: PeripheralData) {
    this.device_id = data.id;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.pressure = {
      actual: 0,
      old: 0,
    };
    this.pressureParentLogger = new Logger();
  }

  public abstract connect(): void;
  public abstract disconnect(): void;
  public abstract updateZero(): Promise<void>;

  public getPressure() {
    return this.pressure.actual;
  }

  public getOldPressure() {
    return this.pressure.old;
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
        PressureDevice.BATTERY_SERVICE_UUID,
        PressureDevice.BATTERY_CHAR_UUID,
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

  protected setPressure(
    _newPressure: number,
    _rawData: any,
    _parsedData: Uint16Array | Float32Array | any
  ) {
    if (Date.now() - this.lastPressureSetTime < UPDATE_EVERY_MS) {
      return;
    }
    this.lastPressureSetTime = Date.now();

    this.pressureParentLogger.log(
      'Bluetooth Pressure Device - New pressure recieved ' +
        _newPressure +
        ' - raw data ' +
        JSON.stringify(_rawData) +
        ' - Parsed Data ' +
        JSON.stringify(_parsedData)
    );

    this.pressure.actual = _newPressure;
    const actualDate = new Date();
    try {
      this.pressureParentLogger.log(
        'Bluetooth Pressure Device - Are subscriptions existing? ' +
          this.pressureChange?.observers?.length
      );
    } catch (ex) {}
    this.pressureChange.emit({
      actual: this.pressure.actual,
      old: this.pressure.old,
      date: actualDate,
    });

    this.pressure.old = _newPressure;
  }
}

export function psiToBar(v: number) {
  return v * 0.0689476;
}
