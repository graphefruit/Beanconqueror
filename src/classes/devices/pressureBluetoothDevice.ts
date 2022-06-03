import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';

declare var ble;

import { EventEmitter } from '@angular/core';

export interface Pressure {
  actual: number;
  old: number;
}
export interface PressureChangeEvent extends Pressure {
  date: Date;
}
export class PressureDevice {
  public device_id: string;
  protected pressure: Pressure;
  protected platforms: Platforms[];
  public batteryLevel: number;

  public pressureChange: EventEmitter<PressureChangeEvent> = new EventEmitter();

  constructor(data: PeripheralData, platforms: Platforms[]) {
    this.device_id = data.id;
    this.platforms = platforms;
  }

  public async connect() {
  }



  public getPressure(): number {
    return null;
  }


  public getOldPressure(): number {
    return 0;
  }

  /**
   * Disconnect is triggered because the bluetooth was turned off, battery shutdown, or something went broken.
   */
  public disconnectTriggered(): void {

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
