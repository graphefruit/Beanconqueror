import { Platforms } from '@ionic/core';
import { PeripheralData } from './ble.types';

import { Pressure, PressureDevice } from './pressureBluetoothDevice';

declare var ble;
export default class PopsiclePressure extends PressureDevice {
  public static PRESSURE_SERVICE_UUID = '<reducted>';
  public static PRESSURE_CHAR_UUID = '<reducted>';

  public static ZERO_SERVICE_UUID = '<reducted>';
  public static ZERO_CHAR_UUID = '<reducted>';

  protected Pressure: Pressure = {
    actual: 0,
    old: 0,
  };

  public static notification_callback(event, scale) {}

  public static test(device) {
    return (
      device && device.name && device.name.toLowerCase().startsWith('popsicle')
    );
  }

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);
    this.connect();
  }

  public async connect() {
    this.updateZero();
    await this.attachNotification();
  }

  public async updateZero(): Promise<void> {
    const data = new Uint8Array(1);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        PopsiclePressure.ZERO_SERVICE_UUID,
        PopsiclePressure.ZERO_CHAR_UUID,
        data.buffer,
        resolve,
        reject
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      PopsiclePressure.PRESSURE_SERVICE_UUID,
      PopsiclePressure.PRESSURE_CHAR_UUID,
      async (_data) => {
        const v = new Uint16Array(_data);
        const psi = swap16(v[0]) / 10;
        this.setPressure(psiToBar(psi));
      },
      (_data) => {}
    );
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      PopsiclePressure.PRESSURE_SERVICE_UUID,
      PopsiclePressure.PRESSURE_CHAR_UUID,
      (e) => {},
      (e) => {}
    );
  }
}

function psiToBar(v: number) {
  return v * 0.0689476;
}

function swap16(val) {
  return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
}
