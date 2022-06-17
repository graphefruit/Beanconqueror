import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';
import { EventEmitter } from '@angular/core';

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

  public pressureChange: EventEmitter<PressureChangeEvent> = new EventEmitter();

  protected constructor(data: PeripheralData, platforms: Platforms[]) {
    this.device_id = data.id;
    this.platforms = platforms;
    this.pressure = {
      actual: 0,
      old: 0,
    };
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
    this.pressure.actual = _newPressure;
    const actualDate = new Date();

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
