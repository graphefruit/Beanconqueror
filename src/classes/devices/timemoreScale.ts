import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;
export class TimemoreScale extends BluetoothScale {
  public static DEVICE_NAME = 'timemore scale';
  public static SERVICE_UUID = '181d';
  public static CHAR_UUID = '2a9d';
  public static CMD_UUID = '553f4e49-bf21-4468-9c6c-0e4fb5b17697';

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  protected override secondWeight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('Timemore Scale');
    this.connect();
    this.supportsTwoWeights = true;
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toLowerCase().includes(this.DEVICE_NAME)
    );
  }

  public override connect(): void {
    this.logger.log('connecting...');
    this.attachNotification();
  }

  public override tare(): void {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    if (this.supportsTwoWeights === true) {
      this.secondWeight.smoothed = 0;
      this.secondWeight.actual = 0;
      this.secondWeight.oldSmoothed = 0;
      this.secondWeight.old = 0;
      this.setSecondWeight(0);
    }

    this.write(new Uint8Array([0x00]));
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  public override setTimer(_timer: SCALE_TIMER_COMMAND): void {
    this.logger.log('Setting Timer command ' + _timer + '...');

    if (_timer === SCALE_TIMER_COMMAND.START) {
      this.write(new Uint8Array([0x08]));
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      this.write(new Uint8Array([0x09]));
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      this.write(new Uint8Array([0x0a]));
    }
  }

  public getInt(buffer: Uint8Array): number {
    const bytes = new DataView(new ArrayBuffer(buffer.length));
    let i = 0;
    const list = new Uint8Array(bytes.buffer);
    for (const value of buffer) {
      list[i] = buffer[i];
      i++;
    }
    return bytes.getInt16(0, true);
  }

  public override getWeight() {
    return this.weight.actual;
  }

  public getSecondWeight(): number {
    return this.secondWeight.actual;
  }

  public override getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public override getOldSmoothedWeight() {
    return this.weight.old;
  }

  private write(_bytes: Uint8Array) {
    ble.write(
      this.device_id,
      TimemoreScale.SERVICE_UUID,
      TimemoreScale.CMD_UUID,
      _bytes.buffer,
      (e: any) => {},
      (e: any) => {},
    );
  }

  private attachNotification(): void {
    ble.startNotification(
      this.device_id,
      TimemoreScale.SERVICE_UUID,
      TimemoreScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }
  private parseStatusUpdate(timemoreRawStatus: Uint8Array) {
    const weight = this.getInt(timemoreRawStatus.slice(1, 4));
    const weight2 = this.getInt(timemoreRawStatus.slice(5, 8));
    this.setWeight(weight / 10);

    this.setSecondWeight(weight2 / 10);
  }

  private deattachNotification(): void {
    ble.stopNotification(
      this.device_id,
      TimemoreScale.SERVICE_UUID,
      TimemoreScale.CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
