import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class ArgosThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'ARGOS';

  // Should Argos be a seperate preperationDevice, so we can track all these?
  // - setpoint would be handy to set on the shot as it doesn't change 
  // - group head & boiler could be tracked in graphs
  // - how would these line up to Visualizer fields of target temp goal, temp basket, temp mix etc 
  public static TEMPERATURE_SERVICE_UUID ='6a521c59-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_SETPOINT_CHAR_UUID = '6a521c60-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_GROUPHEAD_CHAR_UUID = '6a521c62-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_BOILER_CURRENT_CHAR_UUID = '6a521c61-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_BOILER_TARGET_CHAR_UUID = '6a521c66-55b5-4384-85c0-6534e63fb09e';

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
      ArgosThermometer.TEMPERATURE_SETPOINT_CHAR_UUID,

      async (_data: any) => {;
        this.parseStatusUpdate(_data);
      },

      (_data: any) => {}
    );
  }

  private parseStatusUpdate(temperatureRawStatus: ArrayBuffer) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );

    const temperatureDataview = new DataView(temperatureRawStatus);
    const temperature = temperatureDataview.getFloat64(0, true);
      
    const formatNumber = new Intl.NumberFormat(undefined, {
      minimumIntegerDigits: 2,
    }).format;

    const data = formatNumber(temperature);

    this.setTemperature(Number(data), temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      ArgosThermometer.TEMPERATURE_SERVICE_UUID,
      ArgosThermometer.TEMPERATURE_SETPOINT_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
