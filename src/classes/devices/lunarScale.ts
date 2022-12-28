import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { AcaiaScale, EventType } from './acaia';

export class LunarScale extends BluetoothScale {
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };
  private scale: AcaiaScale;

  constructor(data: PeripheralData) {
    super(data);

    this.scale = new AcaiaScale(data.id, data.characteristics);

    this.connect();
  }

  public static test(device: any) {
    return (
      device &&
      device.name &&
      ['ACAIA', 'LUNAR', 'PYXIS', 'PROCH', 'PEARL', 'CINCO'].includes(
        device.name.slice(0, 5)
      )
    );
  }

  public override disconnectTriggered(): void {
    this.scale.disconnectTriggered();
  }

  public override async connect() {
    await this.scale.connect((_eventType: EventType, _data: any) => {
      this.onEvent(_eventType, _data);
    });
  }

  public override async tare() {
    this.scale.tare();

    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;

    this.setWeight(0);
  }

  public override async setLed(_weightOn: boolean, _timerOn: boolean) {}

  public override async setTimer(command: SCALE_TIMER_COMMAND) {
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

  public override getWeight(): number {
    return this.weight.actual;
  }

  public override getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public override getOldSmoothedWeight() {
    return this.weight.oldSmoothed;
  }

  private onEvent(eventType: EventType, data: any) {
    this.blueToothParentlogger.debug(
      'OnEvent received' +
        JSON.stringify(eventType) +
        ' ' +
        JSON.stringify(data)
    );
    switch (eventType) {
      case EventType.WEIGHT:
        const weight = data as number;
        return this.setWeight(weight);
      case EventType.TARE:
        return this.tareEvent.emit();
      case EventType.TIMER_START:
        return this.timerEvent.emit({
          command: SCALE_TIMER_COMMAND.START,
          data,
        });
      case EventType.TIMER_STOP:
        return this.timerEvent.emit({
          command: SCALE_TIMER_COMMAND.STOP,
          data,
        });
      case EventType.TIMER_RESET:
        return this.timerEvent.emit({
          command: SCALE_TIMER_COMMAND.RESET,
          data,
        });
    }
  }
}
