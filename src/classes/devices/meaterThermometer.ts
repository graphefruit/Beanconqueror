import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class MeaterThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'MEATER';
  public static TEMPERATURE_SERVICE_UUID =
    'a75cc7fc-c956-488f-ac2a-2dbc08b63a04';
  public static TEMPERATURE_CHAR_UUID = '7edda774-045e-4bbf-909b-45d1991a2876';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('MeaterTemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.startsWith(MeaterThermometer.DEVICE_NAME)
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
      MeaterThermometer.TEMPERATURE_SERVICE_UUID,
      MeaterThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },

      (_data: any) => {},
    );
  }

  private parseStatusUpdate(temperatureRawStatus: Uint8Array) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus,
    );

    const tipTemperature =
      (temperatureRawStatus[0] + temperatureRawStatus[1] * 256 + 8) / 16;
    this.setTemperature(tipTemperature, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      MeaterThermometer.TEMPERATURE_SERVICE_UUID,
      MeaterThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
