import { PeripheralData } from './ble.types';

import { Pressure, PressureDevice, psiToBar } from './pressureBluetoothDevice';

declare var ble: any;
export class PrsPressure extends PressureDevice {
  public static DEVICE_NAME = 'PRS';
  public static PRESSURE_SERVICE_UUID = '873ae82a-4c5a-4342-b539-9d900bf7ebd0';
  public static PRESSURE_CHAR_UUID = '873ae82b-4c5a-4342-b539-9d900bf7ebd0';

  public static ZERO_SERVICE_UUID = '873ae82a-4c5a-4342-b539-9d900bf7ebd0';
  public static ZERO_CHAR_UUID = '873ae82c-4c5a-4342-b539-9d900bf7ebd0';

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toUpperCase().includes(PrsPressure.DEVICE_NAME)
    );
  }

  public connect() {
    this.attachNotification();
    //Wait after connection for updating to zero.
    setTimeout(() => {
      this.updateZero().catch(() => {});
    }, 1000);
  }

  public updateZero(): Promise<void> {
    const data = new Uint8Array(1);

    return new Promise((resolve, reject) => {
      ble.writeWithoutResponse(
        this.device_id,
        PrsPressure.ZERO_SERVICE_UUID,
        PrsPressure.ZERO_CHAR_UUID,
        data.buffer,
        resolve,
        reject
      );
    });
  }

  public disconnect() {
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
      PrsPressure.PRESSURE_SERVICE_UUID,
      PrsPressure.PRESSURE_CHAR_UUID,
      async (_data: any) => {
        const pressureData = new Uint8Array(_data);
        const val = (pressureData[0] << 8) + pressureData[1];
        let actualPressure: any = 0;
        if (val >= 0x8000) {
          //Negative value
          actualPressure = -1 * (0xffff - val + 1);
        } else {
          //Positive value, nothing todos
          actualPressure = val;
        }

        actualPressure = actualPressure / 1000;
        //Fix pressure to max 1 behind, because pressure of 11.295 is not needed ;)
        actualPressure = this.toFixedIfNecessary(actualPressure, 1);
        this.setPressure(actualPressure, _data, val);
      },
      (_data: any) => {}
    );
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      PrsPressure.PRESSURE_SERVICE_UUID,
      PrsPressure.PRESSURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
