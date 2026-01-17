import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import {
  TemperatureDevice,
  TemperatureSource,
} from './temperatureBluetoothDevice';

declare var ble: any;

export class ArgosThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'ARGOS';

  // Should Argos be a seperate preperationDevice, so we can track all these?
  // - setpoint would be handy to set on the shot as it doesn't change
  // - group head & boiler could be tracked in graphs
  // - how would these line up to Visualizer fields of target temp goal, temp basket, temp mix etc
  public static TEMPERATURE_SERVICE_UUID =
    '6a521c59-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_SETPOINT_CHAR_UUID =
    '6a521c60-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_GROUPHEAD_CHAR_UUID =
    '6a521c62-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_BOILER_CURRENT_CHAR_UUID =
    '6a521c61-55b5-4384-85c0-6534e63fb09e';
  public static TEMPERATURE_BOILER_TARGET_CHAR_UUID =
    '6a521c66-55b5-4384-85c0-6534e63fb09e';

  private logger: Logger;
  private state: {
    setPoint: number;
    boilerTarget: number;
  };

  constructor(data: PeripheralData) {
    super(data, TemperatureSource.SET_POINT);
    this.connect();
    this.logger = new Logger('ArgosTemperatureSensor');
    this.state = {
      setPoint: 0,
      boilerTarget: 0,
    };
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
    this.attachArgosNotification(
      ArgosThermometer.TEMPERATURE_SETPOINT_CHAR_UUID,
    );
    this.attachArgosNotification(
      ArgosThermometer.TEMPERATURE_BOILER_CURRENT_CHAR_UUID,
    );
    this.attachArgosNotification(
      ArgosThermometer.TEMPERATURE_BOILER_TARGET_CHAR_UUID,
    );
  }

  private attachArgosNotification(characteristic: string) {
    ble.startNotification(
      this.device_id,
      ArgosThermometer.TEMPERATURE_SERVICE_UUID,
      characteristic,

      async (_data: any) => {
        this.parseStatusUpdate(_data, characteristic);
      },

      (_data: any) => {},
    );
  }

  public getDefaultTempeatureSource() {
    return TemperatureSource.BASKET_PROBE;
  }

  private parseStatusUpdate(
    temperatureRawStatus: ArrayBuffer,
    characteristic: string,
  ) {
    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus,
    );

    const temperatureDataview = new DataView(temperatureRawStatus);
    const temperature = temperatureDataview.getFloat64(0, true);

    const formatNumber = new Intl.NumberFormat(undefined, {
      minimumIntegerDigits: 2,
    }).format;

    const data = Number(formatNumber(temperature));

    // set temperature on the correct source
    switch (characteristic) {
      case ArgosThermometer.TEMPERATURE_SETPOINT_CHAR_UUID:
        this.state.setPoint = data;
        this.setTemperature(
          data,
          temperatureDataview,
          TemperatureSource.SET_POINT,
        );
        break;
      case ArgosThermometer.TEMPERATURE_BOILER_CURRENT_CHAR_UUID:
        if (this.state.setPoint != 0 && this.state.boilerTarget != 0) {
          // calculate boiler error and approx water temp
          const boilerError = data - this.state.boilerTarget;
          const approxWaterTemp = this.state.setPoint + 0.5 * boilerError;
          this.setTemperature(
            Number(formatNumber(approxWaterTemp)),
            temperatureDataview,
            TemperatureSource.BASKET_PROBE,
          );
        }
        // send raw boiler temp
        this.setTemperature(
          data,
          temperatureDataview,
          TemperatureSource.WATER_PROBE,
        );
        break;
      case ArgosThermometer.TEMPERATURE_BOILER_TARGET_CHAR_UUID:
        this.state.boilerTarget = data;
        break;
    }
  }

  private deattachNotification() {
    this.detachArgosNotification(
      ArgosThermometer.TEMPERATURE_SETPOINT_CHAR_UUID,
    );
    this.detachArgosNotification(
      ArgosThermometer.TEMPERATURE_BOILER_CURRENT_CHAR_UUID,
    );
    this.detachArgosNotification(
      ArgosThermometer.TEMPERATURE_BOILER_TARGET_CHAR_UUID,
    );
  }

  private detachArgosNotification(characteristic: string) {
    ble.stopNotification(
      this.device_id,
      ArgosThermometer.TEMPERATURE_SERVICE_UUID,
      characteristic,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
