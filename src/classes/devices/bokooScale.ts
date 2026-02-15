import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;
export class BookooScale extends BluetoothScale {
  public static DEVICE_NAME = 'bookoo_sc';
  public static SERVICE_UUID = '0FFE';
  public static CHAR_UUID = 'FF11';
  public static CMD_UUID = 'FF12';

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('Bookoo Scale');
    this.connect();
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

    this.write(new Uint8Array([0x03, 0x0a, 0x01, 0x00, 0x00, 0x08]));
  }

  public tareAndStartTimerModeAuto(): void {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    this.write(new Uint8Array([0x03, 0x0a, 0x07, 0x00, 0x00, 0x00]));
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
  }

  public override setTimer(_timer: SCALE_TIMER_COMMAND): void {
    this.logger.log('Setting Timer command ' + _timer + '...');

    if (_timer === SCALE_TIMER_COMMAND.START) {
      this.write(new Uint8Array([0x03, 0x0a, 0x04, 0x00, 0x00, 0x0a]));
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      this.write(new Uint8Array([0x03, 0x0a, 0x05, 0x00, 0x00, 0x0d]));
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      this.write(new Uint8Array([0x03, 0x0a, 0x06, 0x00, 0x00, 0x0c]));
    }
  }

  public override getWeight() {
    return this.weight.actual;
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
      BookooScale.SERVICE_UUID,
      BookooScale.CMD_UUID,
      _bytes.buffer,
      (e: any) => {},
      (e: any) => {},
    );
  }

  private attachNotification(): void {
    this.logger.logDirect('Attaching notification...');
    ble.startNotification(
      this.device_id,
      BookooScale.SERVICE_UUID,
      BookooScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {
        this.logger.logDirect('Attaching notification, error', _data);
      },
    );
  }

  private parseStatusUpdate(bookooRawStatus: Uint8Array) {
    if (bookooRawStatus.length === 20) {
      this.batteryLevel = bookooRawStatus[13];
      let weight =
        (bookooRawStatus[7] << 16) +
        (bookooRawStatus[8] << 8) +
        bookooRawStatus[9];
      if (bookooRawStatus[6] == 45) {
        weight = weight * -1;
      }
      this.setWeight(weight / 100);
    }
  }

  private deattachNotification(): void {
    ble.stopNotification(
      this.device_id,
      BookooScale.SERVICE_UUID,
      BookooScale.CHAR_UUID,
      (e: any) => {
        this.logger.logDirect('Deattaching notification, success', e);
      },
      (e: any) => {
        this.logger.logDirect('Deattaching notification, error', e);
      },
    );
  }
}
