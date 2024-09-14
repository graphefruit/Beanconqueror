import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class ArgosThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'ARGOS';
  public static TEMPERATURE_SERVICE_UUID =
    '6a521c59-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_CHAR_UUID = '6a521c62-55b5-4384-85c0-6534e63fb09e';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('ArgosTemperatureSensor');
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name
        .toLowerCase()
        .startsWith(ArgosThermometer.DEVICE_NAME.toLowerCase())
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
      ArgosThermometer.TEMPERATURE_SERVICE_UUID,
      ArgosThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        const rawData = _data; //new Uint8Array(_data.slice(0, -1));
        this.parseStatusUpdate(rawData);
      },

      (_data: any) => {}
    );
  }

  private parseStatusUpdate(temperatureRawStatus: any) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );
    const formatNumber = new Intl.NumberFormat(undefined, {
      minimumIntegerDigits: 2,
    }).format;

    const setPoint =
      ((temperatureRawStatus.getUint16(5, true) / 127) * 5) / 9 - 32; // Convert from F to C
    const data = formatNumber(setPoint);

    this.setTemperature(Number(data), temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      ArgosThermometer.TEMPERATURE_SERVICE_UUID,
      ArgosThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
