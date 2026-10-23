import { EventEmitter } from '@angular/core';

import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { to128bitUUID } from './common/util';

declare const ble: any;

export interface Grinder {
  burr_gap: number;
  rpm_speed: number;
  feedspeed: number;
}

export interface GrinderChangeEvent extends Grinder {
  date: Date;
}

const UPDATE_EVERY_MS = 1000 / 10;

export abstract class GrinderDevice {
  public static BATTERY_SERVICE_UUID = to128bitUUID('180F');
  public static BATTERY_CHAR_UUID = to128bitUUID('2A19');

  public device_id: string;
  public device_name: string;
  public batteryLevel: number;
  public grinderChange = new EventEmitter<GrinderChangeEvent>();
  public waitForInitialData = false;
  protected grinder: Grinder;
  protected grinderParentLogger: Logger;

  private lastGrinderSetTime = 0;

  protected constructor(data: PeripheralData) {
    this.device_id = data.id;
    this.device_name = data?.name || '';
    this.grinder = {
      burr_gap: 0,
      rpm_speed: 0,
      feedspeed: 0,
    };
    this.grinderParentLogger = new Logger();
  }

  public abstract connect(): void;
  public abstract disconnect(): void;

  /**
   * Gives devices with asynchronous BLE subscription cleanup a way to let
   * callers wait until the old connection has been fully torn down.
   */
  public disconnectAndWait(): Promise<void> {
    this.disconnect();
    return Promise.resolve();
  }

  public getGrinder(): Grinder {
    return { ...this.grinder };
  }

  public hasGrinderData(): boolean {
    return this.lastGrinderSetTime > 0;
  }

  public getBurrGap(): number {
    return this.grinder.burr_gap;
  }

  public getRpmSpeed(): number {
    return this.grinder.rpm_speed;
  }

  public getFeedspeed(): number {
    return this.grinder.feedspeed;
  }

  /**
   * getBattery returns the battery level of the device.
   *
   * @return a promise resolving to a number from 0 to 100 representing available battery percentage
   */
  public getBattery(): Promise<number> {
    return new Promise((resolve, reject) => {
      ble.read(
        this.device_id,
        GrinderDevice.BATTERY_SERVICE_UUID,
        GrinderDevice.BATTERY_CHAR_UUID,
        (buffer: ArrayBuffer) => {
          const data = new Uint8Array(buffer);
          resolve(data[0]);
        },
        (err: unknown) => {
          const error =
            err instanceof Error ? err : new Error(JSON.stringify(err));
          reject(error);
        },
      );
    });
  }

  protected setGrinder(_newGrinder: Partial<Grinder>, _rawData: any) {
    if (Date.now() - this.lastGrinderSetTime < UPDATE_EVERY_MS) {
      return;
    }

    this.lastGrinderSetTime = Date.now();
    this.grinder = {
      ...this.grinder,
      ..._newGrinder,
    };

    this.grinderParentLogger.log(
      'Bluetooth Grinder Device - New grinder attributes received ' +
        JSON.stringify(this.grinder) +
        ' - raw data ' +
        JSON.stringify(_rawData),
    );

    this.grinderChange.emit({
      ...this.grinder,
      date: new Date(),
    });
  }
}
