import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import {
  Temperature,
  TemperatureDevice,
  fahrenheitToCelcius,
  celciusToFahrenheit,
} from './temperatureBluetoothDevice';

declare var ble: any;

export class ETITemperature extends TemperatureDevice {
  public static DEVICE_NAME = 'THERMAQBLUE';
  public static TEMPERATURE_SERVICE_UUID =
    '45544942-4c55-4554-4845-524db87ad700';
  public static TEMPERATURE_CHANNEL_1_TEMP_CHAR_UUID =
    '45544942-4c55-4554-4845-524db87ad701';
  public static TEMPERATURE_CHANNEL_2_TEMP_CHAR_UUID =
    '45544942-4c55-4554-4845-524db87ad703';
  public static TEMPERATURE_CHANNEL_1_CONFIG_CHAR_UUID =
    '45544942-4C55-4554-4845-524DB87AD707';
  public static TEMPERATURE_CHANNEL_2_CONFIG_CHAR_UUID =
    '45544942-4c55-4554-4845-524db87ad708';
  public static TEMPERATURE_DEVICE_CONFIG_CHAR_UUID =
    '45544942-4c55-4554-4845-524db87ad709';
  public static TEMPERATURE_TRIM_CHAR_UUID =
    '45544942-4c55-4554-4845-524db87ad70a';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('ETITemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toUpperCase().includes(ETITemperature.DEVICE_NAME)
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
      ETITemperature.TEMPERATURE_SERVICE_UUID,
      ETITemperature.TEMPERATURE_CHANNEL_1_TEMP_CHAR_UUID,

      async (_data: any) => {
        this.parseStatusUpdate(new Float32Array(_data));
      },

      (_data: any) => {}
    );
  }

  /**
   * ETI Temperature data is a Little Endian IEEE 754 encoded float
   * @param temperatureRawStatus The raw byte array retreived from BLE.
   */
  private parseStatusUpdate(temperatureRawStatus: Float32Array) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );

    var temperatureString = temperatureRawStatus.toString();
    let temperature: any = 0.0;
    // Temperature precision of a K-type thermocouple is ~0.75% or +-0.5C at 0-100C
    // therefore rounding to 1 significant figure is sufficient
    temperature = parseFloat(temperatureString).toFixed(1);
    this.logger.log('temperature is: ' + temperature);

    this.setTemperature(temperature, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      ETITemperature.TEMPERATURE_SERVICE_UUID,
      ETITemperature.TEMPERATURE_CHANNEL_1_TEMP_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
