import { PeripheralData } from './ble.types';

import { Pressure, PressureDevice, psiToBar } from './pressureBluetoothDevice';

declare var ble: any;
export class BookooPressure extends PressureDevice {
  public static DEVICE_NAME = 'bokoo_em';
  public static PRESSURE_SERVICE_UUID = '0FFF';
  public static PRESSURE_CMD_UUID = 'FF01';
  public static PRESSURE_PRESSURE_UUID = 'FF02';
  public static PRESSURE_POWER_UUID = 'FF03';

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toUpperCase().includes(BookooPressure.DEVICE_NAME)
    );
  }

  public connect() {
    this.attachNotification();
    //Wait after connection for updating to zero.
    setTimeout(() => {
      this.updateZero().catch(() => {});
      this.enableNotifications().catch(() => {});
    }, 1000);
  }

  public updateZero(): Promise<void> {
    const data = new Uint8Array(1);

    return new Promise((resolve, reject) => {
      // not available
    });
  }

  public enableNotifications(): Promise<void> {
    const data = new Uint8Array([0x02, 0x0c, 0x01, 0x00, 0x00, 0x00, 0x0f]);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        BookooPressure.PRESSURE_SERVICE_UUID,
        BookooPressure.PRESSURE_CMD_UUID,
        data.buffer,
        () => {
          resolve();
        },
        () => {
          reject();
        }
      );
    });
  }

  public disableNotifications(): Promise<void> {
    const data = new Uint8Array([0x02, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x0e]);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        BookooPressure.PRESSURE_SERVICE_UUID,
        BookooPressure.PRESSURE_CMD_UUID,
        data.buffer,
        () => {
          resolve();
        },
        () => {
          reject();
        }
      );
    });
  }

  public disconnect() {
    this.disableNotifications().catch(() => {});
    this.deattachNotification();
  }

  private toFixedIfNecessary(value: any, dp: number) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      BookooPressure.PRESSURE_SERVICE_UUID,
      BookooPressure.PRESSURE_PRESSURE_UUID,
      async (_data: any) => {
        const pressureData = new Uint8Array(_data);
        const val = (pressureData[4] << 8) + pressureData[5];
        let actualPressure: any = 0;
        actualPressure = actualPressure / 100;
        actualPressure = this.toFixedIfNecessary(actualPressure, 1);
        this.setPressure(actualPressure, _data, val);
      },
      (_data: any) => {}
    );
  }

  private deattachNotification() {
    // stop pressure reading
    ble.stopNotification(
      this.device_id,
      BookooPressure.PRESSURE_SERVICE_UUID,
      BookooPressure.PRESSURE_PRESSURE_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
