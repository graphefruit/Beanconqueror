import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import {
  celciusToFahrenheit,
  fahrenheitToCelcius,
  Temperature,
  TemperatureDevice,
} from './temperatureBluetoothDevice';

declare var ble: any;

export class ETIBlueDotTemperature extends TemperatureDevice {
  public static DEVICE_NAME = 'BLUEDOT';
  public static TEMPERATURE_SERVICE_UUID =
    'bb56aab0-4111-40cf-963b-4a4450ea0822';
  public static TEMPERATURE_CHAR_UUID =
    '783f2991-23e0-4bdc-ac16-78601bd84b39';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('ETIBlueDotTemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.toUpperCase().includes(ETIBlueDotTemperature.DEVICE_NAME)
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
      ETIBlueDotTemperature.TEMPERATURE_SERVICE_UUID,
      ETIBlueDotTemperature.TEMPERATURE_CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(_data);
      },
      (_data: any) => {},
    );
  }

  /**
   * ETI BlueDOT Temperature data is a Little Endian signed 32-bit integer.
   * The first byte of the packet is a header byte, so the temperature
   * starts at byte 1.
   */  
  private parseStatusUpdate(temperatureRawStatus: any) {
    const temperature = new Int32Array(
      temperatureRawStatus.slice(1, 5),
    )[0];

    const isFahrenheit =
      new Uint8Array(temperatureRawStatus.slice(11, 12))[0] === 1;

    const temperatureCelcius = isFahrenheit
      ? fahrenheitToCelcius(temperature)
      : temperature;

    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus,
    );

    this.logger.log(
      'temperature is: ' +
        temperature +
        (isFahrenheit ? ' F' : ' C') +
        ', converted temperature is: ' +
        temperatureCelcius +
        ' C',
    );

    this.setTemperature(temperatureCelcius, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      ETIBlueDotTemperature.TEMPERATURE_SERVICE_UUID,
      ETIBlueDotTemperature.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
