import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class CoffeeSensorTemperature extends TemperatureDevice {
  // BLE advertised name used for device discovery
  public static DEVICE_NAME = 'ESPROFILE';

  // Custom BLE service
  public static DATA_SERVICE = '777b5132-9f56-4850-a14b-34c8df44901a';

  // Individual characteristics
  public static TEMPERATURE_CHAR = '2A6E';
  public static PRESSURE_CHAR = '2A6D';
  public static BOARD_TEMP_CHAR = 'B3A976FF-E863-42F5-B9E9-52967358E6F3';

  // Combined characteristic (preferred — provides all data in one notification)
  // Layout (little-endian):
  //   uint32  timestampMilliseconds   (offset  0, 4 bytes)
  //   float   probeTemperatureCelsius  (offset  4, 4 bytes)
  //   float   pressureBarAbsolute      (offset  8, 4 bytes)
  //   float   boardTemperatureCelsius  (offset 12, 4 bytes)
  //   uint8   batteryPercent           (offset 16, 1 byte, 0-100)
  //   uint8   flags                    (offset 17, 1 byte, bit 0 = chargingBit)
  public static COMBINED_CHAR = '11282dae-6e9c-4223-b6d7-c67878832826';

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('CoffeeSensorTemperature');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name
        .toLowerCase()
        .includes(CoffeeSensorTemperature.DEVICE_NAME.toLowerCase())
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
      CoffeeSensorTemperature.DATA_SERVICE,
      CoffeeSensorTemperature.COMBINED_CHAR,
      async (_data: any) => {
        this.parseCombinedUpdate(new DataView(_data));
      },
      (_data: any) => {},
    );
  }

  // Valid temperature range (matches reference implementation)
  private static MIN_CELSIUS = 0.0;
  private static MAX_CELSIUS = 999.0;

  private parseCombinedUpdate(view: DataView) {
    // Combined characteristic layout (all little-endian):
    //    0: uint32 timestampMilliseconds
    //    4: float  probeTemperatureCelsius
    //    8: float  pressureBarAbsolute
    //   12: float  boardTemperatureCelsius
    //   16: uint8  batteryPercent (0-100)
    //   17: uint8  flags (bit 0 = chargingBit)
    if (view.byteLength < 18) {
      return;
    }

    const rawTemperature = view.getFloat32(4, true);
    const probeTemperature = Math.min(
      Math.max(rawTemperature, CoffeeSensorTemperature.MIN_CELSIUS),
      CoffeeSensorTemperature.MAX_CELSIUS,
    );
    const batteryPercent = view.getUint8(16);

    this.batteryLevel = batteryPercent;

    this.logger.log(
      'CoffeeSensorTemperature - probe temp: ' +
        probeTemperature +
        ' °C, battery: ' +
        batteryPercent +
        '%',
    );

    this.setTemperature(probeTemperature, view.buffer);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      CoffeeSensorTemperature.DATA_SERVICE,
      CoffeeSensorTemperature.COMBINED_CHAR,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
