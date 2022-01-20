import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { AcaiaScale, EventType } from './acaia';

declare var ble;
export default class LunarScale extends BluetoothScale {
  private scale: AcaiaScale;
  protected weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };

  public static test(device) {
    return device && device.name && ['ACAIA', 'LUNAR', 'PYXIS', 'PROCH', 'PEARL', 'CINCO'].includes(device.name.slice(0, 5));
  }

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);

    this.scale = new AcaiaScale(data.id, platforms, data.characteristics);
    this.connect();
  }


  public disconnectTriggered (): void {
    this.scale.disconnectTriggered();
  }

  public async connect() {
    await this.scale.connect(this.onEvent.bind(this));
  }

  public async tare() {
    this.scale.tare();

    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;

    this.setWeight(0);
  }

  public async setLed(_weightOn: boolean, _timerOn: boolean) {
  }

  public async setTimer(command: SCALE_TIMER_COMMAND) {
    if (this.scale.isConnected()) {
      if (command === SCALE_TIMER_COMMAND.START) {
        this.scale.startTimer();
      } else if (command === SCALE_TIMER_COMMAND.STOP) {
        this.scale.stopTimer();
      } else {
        this.scale.resetTimer();
      }
    }
  }

  public getWeight(): number {
    return this.weight.actual;
  }

  public getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public getOldSmoothedWeight() {
    return this.weight.oldSmoothed;
  }

  private onEvent(eventType: EventType, data: any) {
    switch (eventType) {
      case EventType.WEIGHT:
        const weight = data as number;
        return this.setWeight(weight);
      case EventType.TARE:
        return this.tareEvent.emit();
      case EventType.TIMER_START:
        return this.timerEvent.emit({ command: SCALE_TIMER_COMMAND.START, data });
      case EventType.TIMER_STOP:
        return this.timerEvent.emit({ command: SCALE_TIMER_COMMAND.STOP, data });
      case EventType.TIMER_RESET:
        return this.timerEvent.emit({ command: SCALE_TIMER_COMMAND.RESET, data });
    }
  }
}
