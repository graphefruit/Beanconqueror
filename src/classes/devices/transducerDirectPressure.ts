import { LimitedPeripheralData, PeripheralData } from './ble.types';

import { PressureDevice, psiToBar } from './pressureBluetoothDevice';
import { parseAdvertisingManufacturerData } from './common/util';

declare var ble: any;
export class TransducerDirectPressure extends PressureDevice {
  public static PRESSURE_SERVICE_UUID = 'CC4A6A80-51E0-11E3-B451-0002A5D5C51B';
  public static PRESSURE_CHAR_UUID = '835AB4C0-51E4-11E3-A5BD-0002A5D5C51B';

  public static ZERO_SERVICE_UUID = 'CC4A6A80-51E0-11E3-B451-0002A5D5C51B';
  public static ZERO_CHAR_UUID = '8CD67DA0-DA9B-11E3-9087-0002A5D5C51B';

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
  }

  public static test(device: LimitedPeripheralData) {
    const adv =
      device &&
      device.advertising &&
      parseAdvertisingManufacturerData(device.advertising);
    return adv && adv.length >= 2 && adv[0] === 0x0c && adv[1] === 0x01;
  }

  public connect() {
    this.attachNotification();

    setTimeout(() => {
      this.updateZero().catch(() => {});
    }, 1000);
  }

  public async updateZero(): Promise<void> {
    const data = new Uint8Array(1);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        TransducerDirectPressure.ZERO_SERVICE_UUID,
        TransducerDirectPressure.ZERO_CHAR_UUID,
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
    this.deattachNotification();
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      TransducerDirectPressure.PRESSURE_SERVICE_UUID,
      TransducerDirectPressure.PRESSURE_CHAR_UUID,
      (_data: any) => {
        const v = new Int16Array(_data);

        const psi = swap16(v[0]) / 10;
        this.setPressure(psiToBar(psi), _data, v);
      },
      (_data: any) => {}
    );
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      TransducerDirectPressure.PRESSURE_SERVICE_UUID,
      TransducerDirectPressure.PRESSURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}

function swap16(val: any) {
  return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
