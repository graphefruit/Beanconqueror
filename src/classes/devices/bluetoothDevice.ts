import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';

declare var ble;

import { EventEmitter } from '@angular/core';
import {Logger} from './common/logger';

export enum SCALE_TIMER_COMMAND {
  STOP = 'STOP',
  RESET = 'RESET',
  START = 'START'
}

export interface Weight {
  actual: number;
  old: number;
  smoothed: number;
  oldSmoothed: number;
}

export interface WeightChangeEvent extends Weight {
  stable: boolean;
}

export interface FlowChangeEvent extends WeightChangeEvent {
  date: Date;
}

export interface TimerEvent {
  command: SCALE_TIMER_COMMAND;
  data: any;
}
export type TareEvent = undefined;

export class BluetoothScale {
  public device_id: string;
  protected weight: Weight;
  protected platforms: Platforms[];
  public batteryLevel: number;
  private blueToothParentlogger: Logger;
  public weightChange: EventEmitter<WeightChangeEvent> = new EventEmitter();
  public flowChange: EventEmitter<FlowChangeEvent> = new EventEmitter();

  public timerEvent: EventEmitter<TimerEvent | null> = new EventEmitter();
  public tareEvent: EventEmitter<TareEvent> = new EventEmitter();

  constructor(data: PeripheralData, platforms: Platforms[]) {
    this.device_id = data.id;
    this.platforms = platforms;
    this.blueToothParentlogger = new Logger();

  }

  public async connect() {
  }

  public async tare() {
  }

  public async setLed(_weightOn: boolean, _timerOn: boolean) {
  }

  public async setTimer(_timer: SCALE_TIMER_COMMAND) {
  }

  public getWeight(): number {
    return null;
  }

  public getSmoothedWeight(): number {
    return 0;
  }

  public getOldSmoothedWeight(): number {
    return 0;
  }

  /**
   * Disconnect is triggered because the scale was turned off, battery shutdown, or something went broken.
   */
  public disconnectTriggered(): void {

  }

  protected setWeight(_newWeight: number, _stableWeight: boolean = false) {
    // Allow negative weight
    // Each value effect the current weight bei 10%.
    // (A3 * 03 + b2 * 0.7)
    //  Actual value * 03 + smoothed value * 0.7

    this.blueToothParentlogger.log('Bluetooth Scale - New weight recieved ' + _newWeight);

    this.weight.oldSmoothed = this.weight.smoothed;
    this.weight.smoothed = this.calculateSmoothedWeight(_newWeight, this.weight.smoothed);

    // We passed every shake change, seems like everything correct, set the new weight.
    this.weight.actual = _newWeight;

    try {
      this.blueToothParentlogger.log('Bluetooth Scale - Are weight subscriptions existing? ' + this.weightChange?.observers?.length);
    }catch(ex) {

    }
    this.weightChange.emit({
      actual: this.weight.actual,
      smoothed: this.weight.smoothed,
      stable: _stableWeight,
      old: this.weight.old,
      oldSmoothed: this.weight.oldSmoothed,
    });
    this.triggerFlow(_stableWeight);
    this.weight.old = _newWeight;
  }

  protected calculateSmoothedWeight(_actualWeight: number, _smoothedWeight: number): number {
    return (_actualWeight * 0.3) + (_smoothedWeight * 0.7);
  }

  protected triggerFlow(_stableWeight: boolean = false) {
    const actualDate = new Date();
    this.blueToothParentlogger.log('Bluetooth Scale - Flow triggered');
    try {
      this.blueToothParentlogger.log('Bluetooth Scale - Are flow subscriptions existing? ' + this.flowChange?.observers?.length);
    }catch(ex) {

    }
    this.flowChange.emit({
      actual: this.weight.actual,
      smoothed: this.weight.smoothed,
      stable: _stableWeight,
      old: this.weight.old,
      oldSmoothed: this.weight.oldSmoothed,
      date: actualDate,
    });
  }
}
