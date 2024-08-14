import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import {
  Temperature,
  TemperatureDevice,
  fahrenheitToCelcius,
  celciusToFahrenheit,
} from './temperatureBluetoothDevice';

declare var ble: any;

export class BasicGrillThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'BLE#0x';
  public static TEMPERATURE_SERVICE_UUID = '1000'; // '00001000-0000-1000-8000-00805f9b34fb'
  public static TEMPERATURE_CHAR_UUID = '1002'; // '00001002-0000-1000-8000-00805f9b34fb'

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('BasicGrillTemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.startsWith(BasicGrillThermometer.DEVICE_NAME)
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
      BasicGrillThermometer.TEMPERATURE_SERVICE_UUID,
      BasicGrillThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },

      (_data: any) => {}
    );
  }

  private parseStatusUpdate(temperatureRawStatus: Uint8Array) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );

    const temperature =
      (temperatureRawStatus[0] ^
        temperatureRawStatus[2] ^
        temperatureRawStatus[8]) *
        10 +
      (temperatureRawStatus[0] ^
        temperatureRawStatus[2] ^
        temperatureRawStatus[9]);

    this.logger.log('temperature is: ' + temperature);

    this.setTemperature(temperature, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      BasicGrillThermometer.TEMPERATURE_SERVICE_UUID,
      BasicGrillThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
