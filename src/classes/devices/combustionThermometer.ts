import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class CombustionThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'Combustion Inc';
  public static TEMPERATURE_SERVICE_UUID =
    '00000100-CAAB-3792-3D44-97AE51C1407A';
  public static TEMPERATURE_CHAR_UUID = '00000101-CAAB-3792-3D44-97AE51C1407A';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('CombustionTemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.advertising.kCBAdvDataServiceUUIDs.indexOf(
        '00000100-CAAB-3792-3D44-97AE51C1407A'
      ) >= 0
    );
  }

  public connect() {
    this.attachNotification();
  }

  public disconnect() {
    this.deattachNotification();
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      CombustionThermometer.TEMPERATURE_SERVICE_UUID,
      CombustionThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        console.log(_data);
        this.parseStatusUpdate(new Uint8Array(_data));
      },

      (_data: any) => {}
    );
  }

  private parseStatusUpdate(temperatureRawStatus: Uint8Array) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );

    const tipTemperature =
      ((temperatureRawStatus[0] & 0xff) << 5) |
      ((temperatureRawStatus[1] & 0xf8) >> 3);
    console.log(tipTemperature);
    this.setTemperature(tipTemperature, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      CombustionThermometer.TEMPERATURE_SERVICE_UUID,
      CombustionThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
