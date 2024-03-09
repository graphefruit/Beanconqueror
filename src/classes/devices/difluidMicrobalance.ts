import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './index';

declare var ble: any;
export class DifluidMicrobalance extends BluetoothScale {
  public static DEVICE_NAME = 'microbalance';
  public static DEVICE_NAME_TWO = 'mb ti';
  public static SERVICE_UUID = '00EE';
  public static CHAR_UUID = 'AA01';

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };

  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('DiFluid Scale');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toLowerCase().includes(this.DEVICE_NAME)
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    await this.attachNotification();
    await setTimeout(async () => {
      await this.setUnitToGram();
    }, 100);
    await setTimeout(async () => {
      await this.enableAutoNotifications();
    }, 100);
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    await this.write(
      new Uint8Array([0xdf, 0xdf, 0x03, 0x02, 0x01, 0x01, 0xc5])
    );
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  public async setUnitToGram() {
    await this.write(
      new Uint8Array([0xdf, 0xdf, 0x01, 0x04, 0x01, 0x00, 0xc4])
    );
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + _timer + '...');

    if (_timer === SCALE_TIMER_COMMAND.START) {
      await this.write(
        new Uint8Array([0xdf, 0xdf, 0x03, 0x02, 0x01, 0x00, 0xc4])
      );
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      await this.write(
        new Uint8Array([0xdf, 0xdf, 0x03, 0x01, 0x01, 0x00, 0xc3])
      );
    }
  }

  public async enableAutoNotifications() {
    this.logger.log('enabling auto notifications');
    await this.write(
      new Uint8Array([0xdf, 0xdf, 0x01, 0x00, 0x01, 0x01, 0xc1])
    );
  }

  public async getInt(buffer: Uint8Array) {
    const bytes = new DataView(new ArrayBuffer(buffer.length));
    let i = 0;
    const list = new Uint8Array(bytes.buffer);
    for (const value of buffer) {
      list[i] = buffer[i];
      i++;
    }
    return bytes.getInt32(0, false);
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
        DifluidMicrobalance.SERVICE_UUID,
        DifluidMicrobalance.CHAR_UUID,
        _bytes.buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          resolve(false);
        }
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      DifluidMicrobalance.SERVICE_UUID,
      DifluidMicrobalance.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {}
    );
  }
  private async parseStatusUpdate(difluidRawStatus: Uint8Array) {
    if (
      difluidRawStatus[2] === 3 &&
      difluidRawStatus[3] === 2 &&
      difluidRawStatus[5] === 2
    ) {
      // left button pressed - starting timer
      this.timerEvent.emit({
        command: SCALE_TIMER_COMMAND.START,
        data: undefined,
      });
    }
    if (difluidRawStatus.length >= 19 && difluidRawStatus[3] === 0) {
      const weight = await this.getInt(difluidRawStatus.slice(5, 9));
      this.setWeight(weight / 10);
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      DifluidMicrobalance.SERVICE_UUID,
      DifluidMicrobalance.CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
