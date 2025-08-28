import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;
export class WeighMyBruScale extends BluetoothScale {
  public static DEVICE_NAME = 'WeighMyBru';
  public static SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  /**002 is for gaggimate, 004 is for beanconqueror weight **/
  public static CHAR_UUID = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';
  public static CMD_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

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
    this.logger = new Logger('WeighMyBru Scale');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toLowerCase().includes(this.DEVICE_NAME.toLowerCase())
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    await this.attachNotification();
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    await this.write(new Uint8Array([0x03, 0x0a, 0x01, 0x01, 0x00]));
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + _timer + '...');

    if (_timer === SCALE_TIMER_COMMAND.START) {
      await this.write(new Uint8Array([0x03, 0x0a, 0x02, 0x01, 0x00]));
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      await this.write(new Uint8Array([0x03, 0x0a, 0x03, 0x01, 0x00]));
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      await this.write(new Uint8Array([0x03, 0x0a, 0x04, 0x01, 0x00]));
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
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        WeighMyBruScale.SERVICE_UUID,
        WeighMyBruScale.CMD_UUID,
        _bytes.buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          this.logger.log('Write error', e);
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    this.logger.logDirect('Attaching notification...');
    ble.startNotification(
      this.device_id,
      WeighMyBruScale.SERVICE_UUID,
      WeighMyBruScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {
        this.logger.logDirect('Attaching notification, error', _data);
      },
    );
  }

  private async parseStatusUpdate(weighMyBruRawStatus: Uint8Array) {
    // The documentation says "Weight in grams as floating-point value"
    // It doesn't specify the byte order or the length of the data.
    // Let's assume it's a 4-byte float in little-endian format.
    if (weighMyBruRawStatus.buffer.byteLength >= 4) {
      const weight = new DataView(weighMyBruRawStatus.buffer).getFloat32(
        0,
        true,
      );
      this.setWeight(weight);
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      WeighMyBruScale.SERVICE_UUID,
      WeighMyBruScale.CHAR_UUID,
      (e: any) => {
        this.logger.logDirect('Deattaching notification, success', e);
      },
      (e: any) => {
        this.logger.logDirect('Deattaching notification, error', e);
      },
    );
  }
}
