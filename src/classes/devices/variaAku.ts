import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;
export class VariaAkuScale extends BluetoothScale {
  public static DEVICE_NAME = 'varia aku';
  public static DEVICE_NAME_SECOND = 'aku mini';
  public static SERVICE_UUID = 'FFF0';
  public static CHAR_UUID = 'FFF1';
  public static CMD_UUID = 'FFF2';

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
    this.logger = new Logger('Varia Aku');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      (device.name.toLowerCase().includes(this.DEVICE_NAME) ||
        device.name.toLowerCase().includes(this.DEVICE_NAME_SECOND))
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    await this.attachNotification();
  }

  private getXOR(_bytes: any) {
    return _bytes[0] ^ _bytes[1] ^ _bytes[2];
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    await this.write([0xfa, 0x82, 0x01, 0x01, this.getXOR([0x82, 0x01, 0x01])]);
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + _timer + '...');
    if (_timer === SCALE_TIMER_COMMAND.START) {
      this.write([0xfa, 0x88, 0x01, 0x01, this.getXOR([0x88, 0x01, 0x01])]);
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      this.write([0xfa, 0x89, 0x01, 0x01, this.getXOR([0x89, 0x01, 0x01])]);
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      this.write([0xfa, 0x8a, 0x01, 0x01, this.getXOR([0x8a, 0x01, 0x01])]);
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

  private write(_bytes: number[]) {
    ble.writeWithoutResponse(
      this.device_id,
      VariaAkuScale.SERVICE_UUID,
      VariaAkuScale.CMD_UUID,
      new Uint8Array(_bytes).buffer,
      (e: any) => {},
      (e: any) => {},
    );
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      VariaAkuScale.SERVICE_UUID,
      VariaAkuScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }

  private async parseStatusUpdate(rawStatus: Uint8Array) {
    if (rawStatus[1] === 0x01) {
      const sign: number = (rawStatus[3] & 0x10) === 0 ? 1 : -1;
      const actualData =
        sign *
        (((rawStatus[3] & 0x0f) << 16) + (rawStatus[4] << 8) + rawStatus[5]);
      if (!isNaN(actualData)) {
        this.setWeight(actualData / 100);
      }
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      VariaAkuScale.SERVICE_UUID,
      VariaAkuScale.CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
