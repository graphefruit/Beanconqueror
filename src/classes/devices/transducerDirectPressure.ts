import { Platforms } from '@ionic/core';
import { LimitedPeripheralData, PeripheralData } from './ble.types';

import { Pressure, PressureDevice, psiToBar } from './pressureBluetoothDevice';

declare var ble;
export default class TransducerDirectPressure extends PressureDevice {
  public static PRESSURE_SERVICE_UUID = 'CC4A6A80-51E0-11E3-B451-0002A5D5C51B';
  public static PRESSURE_CHAR_UUID = '835AB4C0-51E4-11E3-A5BD-0002A5D5C51B';

  public static ZERO_SERVICE_UUID = 'CC4A6A80-51E0-11E3-B451-0002A5D5C51B';
  public static ZERO_CHAR_UUID = '8CD67DA0-DA9B-11E3-9087-0002A5D5C51B';

  public static test(device: LimitedPeripheralData) {
    return (
      device &&
      device.advertising &&
      device.advertising.length >= 2 &&
      device.advertising[0] === 0x0c &&
      device.advertising[1] === 0x01
    );
  }

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);
    this.connect();
  }

  public connect(): Promise<void> {
    this.attachNotification();

    return this.updateZero().catch(() => {}); // ignore error
  }

  public async updateZero(): Promise<void> {
    const data = new Uint8Array(1);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        TransducerDirectPressure.ZERO_SERVICE_UUID,
        TransducerDirectPressure.ZERO_CHAR_UUID,
        data.buffer,
        resolve,
        reject
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
      (_data) => {
        const v = new Uint16Array(_data);
        const psi = swap16(v[0]) / 10;
        this.setPressure(psiToBar(psi));
      },
      (_data) => {}
    );
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      TransducerDirectPressure.PRESSURE_SERVICE_UUID,
      TransducerDirectPressure.PRESSURE_CHAR_UUID,
      (e) => {},
      (e) => {}
    );
  }
}

function swap16(val) {
  return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
