import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';
import {Logger} from './common/logger';

export interface Pressure {
  actual: number;
  old: number;
}

export interface PressureChangeEvent extends Pressure {
  date: Date;
}

export abstract class PressureDevice {
  public device_id: string;
  protected pressure: Pressure;
  protected platforms: Platforms[];
  public batteryLevel: number;
  private pressureParentLogger: Logger;
  public pressureChange: EventEmitter<PressureChangeEvent> = new EventEmitter();

  protected constructor(data: PeripheralData, platforms: Platforms[]) {
    this.device_id = data.id;
    this.platforms = platforms;
    this.pressure = {
      actual: 0,
      old: 0,
    };
    this.pressureParentLogger = new Logger();
  }

  public abstract connect(): Promise<void>;
  public abstract disconnect(): void;
  public abstract updateZero(): Promise<void>;

  public getPressure() {
    return this.pressure.actual;
  }

  public getOldPressure() {
    return this.pressure.old;
  }

  protected setPressure(_newPressure: number) {
    this.pressureParentLogger.log('Bluetooth Pressure Device - New pressure recieved ' + _newPressure);
    this.pressure.actual = _newPressure;
    const actualDate = new Date();
    try {
      this.pressureParentLogger.log('Bluetooth Pressure Device - Are subscriptions existing? ' + this.pressureChange?.observers?.length);
    }catch(ex) {

    }
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
