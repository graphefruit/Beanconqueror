import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { RefractometerDevice } from './refractometerBluetoothDevice';

declare var ble: any;
export class DiFluidR2Refractometer extends RefractometerDevice {
  public static SERVICE_UUID = '00FF';
  public static CHAR_UUID = 'AA01';
  public static DEVICE_NAME = 'r2';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('DiFluid Refractometer');
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
      await this.enableAutoNotifications();
    }, 100);
    await setTimeout(async () => {
      await this.setDeviceToCelsius();
    }, 100);
  }

  public disconnect() {
    this.deattachNotification();
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');

    this.deattachNotification();
  }

  public override async requestRead() {
    await this.write(new Uint8Array([0xdf, 0xdf, 0x03, 0x00, 0x00, 0xc1]));
  }

  public async enableAutoNotifications() {
    this.logger.log('enabling auto notifications');
    await this.write(
      new Uint8Array([0xdf, 0xdf, 0x01, 0x00, 0x01, 0x01, 0xc1])
    );
  }

  public async setDeviceToCelsius() {
    this.logger.log('set R2 to celsius');
    await this.write(
      new Uint8Array([0xdf, 0xdf, 0x01, 0x00, 0x01, 0x00, 0xc0])
    );
  }

  private write(_bytes: Uint8Array) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        DiFluidR2Refractometer.SERVICE_UUID,
        DiFluidR2Refractometer.CHAR_UUID,
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
      DiFluidR2Refractometer.SERVICE_UUID,
      DiFluidR2Refractometer.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {}
    );
  }
  private async parseStatusUpdate(difluidRawStatus: Uint8Array) {
    this.logger.log(difluidRawStatus);
    if (difluidRawStatus[3] == 254) {
      this.logger.log('no liquid');
    }
    if (difluidRawStatus[4] == 3 && difluidRawStatus[5] == 0) {
      if (difluidRawStatus[6] == 11) {
        this.logger.log('test started');
      } else if (difluidRawStatus[6] == 0) {
        this.logger.log('test finished');
      }
    } else if (difluidRawStatus[4] == 6 && difluidRawStatus[5] == 1) {
      this.logger.log('temp result received');
      const tempTank = await this.getInt(difluidRawStatus.slice(9, 11));
      this.setTempReading(tempTank / 10);
    } else if (difluidRawStatus[4] == 7 && difluidRawStatus[5] == 2) {
      this.logger.log('tds result received');
      const tds = await this.getInt(difluidRawStatus.slice(6, 8));
      this.setTdsReading(tds / 100);
      // this.currentlyTesting = false;
    }
  }

  public async getInt(buffer: Uint8Array) {
    const bytes = new DataView(new ArrayBuffer(buffer.length));
    let i = 0;
    const list = new Uint8Array(bytes.buffer);
    for (const value of buffer) {
      list[i] = buffer[i];
      i++;
    }
    if (buffer.length == 2) {
      return bytes.getInt16(0, false);
    } else {
      return bytes.getInt32(0, false);
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      DiFluidR2Refractometer.SERVICE_UUID,
      DiFluidR2Refractometer.CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
