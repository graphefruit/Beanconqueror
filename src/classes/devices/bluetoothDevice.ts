import { PeripheralData } from './ble.types';

declare var ble: any;

import { EventEmitter } from '@angular/core';
import { Logger } from './common/logger';
import { ScaleType } from './index';

export enum SCALE_TIMER_COMMAND {
  STOP = 'STOP',
  RESET = 'RESET',
  START = 'START',
}

export interface Weight {
  actual: number;
  old: number;
  smoothed: number;
  oldSmoothed: number;
  notMutatedWeight: number;
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
  public device_name: string;
  public batteryLevel: number;
  public weightChange: EventEmitter<WeightChangeEvent> = new EventEmitter();
  public flowChange: EventEmitter<FlowChangeEvent> = new EventEmitter();

  public weightSecondChange: EventEmitter<WeightChangeEvent> =
    new EventEmitter();
  public flowSecondChange: EventEmitter<FlowChangeEvent> = new EventEmitter();

  public timerEvent: EventEmitter<TimerEvent | null> = new EventEmitter();
  public tareEvent: EventEmitter<TareEvent> = new EventEmitter();
  public supportsTaring: boolean;
  public supportsTwoWeights: boolean;
  protected weight: Weight;
  protected secondWeight: Weight;
  protected blueToothParentlogger: Logger;
  private scaleType = undefined;

  private doubleWeight: boolean = false;
  constructor(data: PeripheralData, type: ScaleType) {
    this.device_id = data.id;
    this.supportsTaring = true;
    this.supportsTwoWeights = false;
    try {
      this.device_name = data.name;
    } catch (ex) {}
    this.scaleType = type;
    this.blueToothParentlogger = new Logger();
  }
  public getScaleType(): ScaleType | undefined {
    return this.scaleType;
  }
  public async connect() {}

  public async tare() {}

  public async setLed(_weightOn: boolean, _timerOn: boolean) {}

  public async setTimer(_timer: SCALE_TIMER_COMMAND) {}

  public getWeight(): number {
    return 0;
  }
  public getSecondWeight(): number {
    return 0;
  }

  public setDoubleWeight(_doubleIt: boolean) {
    this.doubleWeight = _doubleIt;
  }

  public resetSmoothedValue() {
    this.weight.smoothed = 0;
    this.weight.oldSmoothed = 0;
  }

  public getSmoothedWeight(): number {
    return 0;
  }

  public getOldSmoothedWeight(): number {
    return 0;
  }

  public setOldWeight(_weight: number) {
    this.weight.old = _weight;
  }

  /**
   * Disconnect is triggered because the scale was turned off, battery shutdown, or something went broken.
   */
  public disconnectTriggered(): void {}

  protected setWeight(_newWeight: number, _stableWeight: boolean = false) {
    // Allow negative weight
    // Each value effect the current weight bei 10%.
    // (A3 * 03 + b2 * 0.7)
    //  Actual value * 03 + smoothed value * 0.7
    let newWeight = _newWeight;
    this.weight.notMutatedWeight = newWeight;

    this.blueToothParentlogger.log(
      'Bluetooth Scale - New weight recieved ' + newWeight,
    );

    if (this.doubleWeight) {
      newWeight = newWeight * 2;
      this.blueToothParentlogger.log(
        'Bluetooth Scale - Weight doubled' + newWeight,
      );
    }

    this.weight.oldSmoothed = this.weight.smoothed;
    this.weight.smoothed = this.calculateSmoothedWeight(
      newWeight,
      this.weight.smoothed,
    );

    // We passed every shake change, seems like everything correct, set the new weight.
    this.weight.actual = newWeight;

    try {
      this.blueToothParentlogger.log(
        'Bluetooth Scale - Are weight subscriptions existing? ' +
          this.weightChange?.observers?.length,
      );
    } catch (ex) {}
    this.weightChange.emit({
      actual: this.weight.actual,
      smoothed: this.weight.smoothed,
      stable: _stableWeight,
      old: this.weight.old,
      oldSmoothed: this.weight.oldSmoothed,
      notMutatedWeight: this.weight.notMutatedWeight,
    });
    this.triggerFlow(_stableWeight);
    this.weight.old = newWeight;
  }

  protected setSecondWeight(
    _newWeight: number,
    _stableWeight: boolean = false,
  ) {
    // Allow negative weight
    // Each value effect the current weight bei 10%.
    // (A3 * 03 + b2 * 0.7)
    //  Actual value * 03 + smoothed value * 0.7

    this.secondWeight.notMutatedWeight = _newWeight;

    this.blueToothParentlogger.log(
      'Bluetooth Scale - New weight recieved ' + _newWeight,
    );

    this.secondWeight.oldSmoothed = this.secondWeight.smoothed;
    this.secondWeight.smoothed = this.calculateSmoothedWeight(
      _newWeight,
      this.secondWeight.smoothed,
    );

    // We passed every shake change, seems like everything correct, set the new weight.
    this.secondWeight.actual = _newWeight;

    try {
      this.blueToothParentlogger.log(
        'Bluetooth Scale - Are weight subscriptions existing? ' +
          this.weightSecondChange?.observers?.length,
      );
    } catch (ex) {}
    this.weightSecondChange.emit({
      actual: this.secondWeight.actual,
      smoothed: this.secondWeight.smoothed,
      stable: _stableWeight,
      old: this.secondWeight.old,
      oldSmoothed: this.secondWeight.oldSmoothed,
      notMutatedWeight: this.secondWeight.notMutatedWeight,
    });
    this.triggerSecondFlow(_stableWeight);
    this.secondWeight.old = _newWeight;
  }
  protected calculateSmoothedWeight(
    _actualWeight: number,
    _smoothedWeight: number,
  ): number {
    return _actualWeight * 0.3 + _smoothedWeight * 0.7;
  }

  protected triggerFlow(_stableWeight: boolean = false) {
    const actualDate = new Date();
    this.blueToothParentlogger.log('Bluetooth Scale - Flow triggered');
    try {
      this.blueToothParentlogger.log(
        'Bluetooth Scale - Are flow subscriptions existing? ' +
          this.flowChange?.observers?.length,
      );
    } catch (ex) {}
    this.flowChange.emit({
      actual: this.weight.actual,
      smoothed: this.weight.smoothed,
      stable: _stableWeight,
      old: this.weight.old,
      oldSmoothed: this.weight.oldSmoothed,
      date: actualDate,
      notMutatedWeight: this.weight.notMutatedWeight,
    });
  }

  protected triggerSecondFlow(_stableWeight: boolean = false) {
    const actualDate = new Date();
    this.blueToothParentlogger.log('Bluetooth Scale - Flow second triggered');
    try {
      this.blueToothParentlogger.log(
        'Bluetooth Scale - Are flow second subscriptions existing? ' +
          this.flowSecondChange?.observers?.length,
      );
    } catch (ex) {}
    this.flowSecondChange.emit({
      actual: this.secondWeight.actual,
      smoothed: this.secondWeight.smoothed,
      stable: _stableWeight,
      old: this.secondWeight.old,
      oldSmoothed: this.secondWeight.oldSmoothed,
      date: actualDate,
      notMutatedWeight: this.secondWeight.notMutatedWeight,
    });
  }
}
