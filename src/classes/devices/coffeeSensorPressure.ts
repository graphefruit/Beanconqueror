import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { PressureDevice } from './pressureBluetoothDevice';

declare var ble: any;

export class CoffeeSensorPressure extends PressureDevice {
  // BLE advertised name used for device discovery
  public static DEVICE_NAME = 'ESPROFILE';

  // Custom BLE service
  public static DATA_SERVICE = '777b5132-9f56-4850-a14b-34c8df44901a';

  // Individual characteristics
  public static PRESSURE_CHAR = '2A6D';
  public static TEMPERATURE_CHAR = '2A6E';
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
    this.logger = new Logger('CoffeeSensorPressure');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name
        .toLowerCase()
        .includes(CoffeeSensorPressure.DEVICE_NAME.toLowerCase())
    );
  }

  public connect() {
    this.attachNotification();
  }

  public disconnect() {
    this.deattachNotification();
  }

  public async updateZero(): Promise<void> {
    // CoffeeSensor does not support hardware zero — no-op
  }

  public enableValueTransmission(): void {
    // not needed for this device
  }

  public disableValueTransmission(): Promise<void> {
    // not needed for this device
    return null;
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      CoffeeSensorPressure.DATA_SERVICE,
      CoffeeSensorPressure.COMBINED_CHAR,
      async (_data: any) => {
        this.parseCombinedUpdate(new DataView(_data));
      },
      (_data: any) => {},
    );
  }

  // Atmospheric pressure offset to convert absolute → gauge pressure
  private static ATMOSPHERIC_BAR = 0.98;

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

    const pressureBarAbsolute = view.getFloat32(8, true);
    const pressureBar =
      pressureBarAbsolute - CoffeeSensorPressure.ATMOSPHERIC_BAR;
    const batteryPercent = view.getUint8(16);

    this.batteryLevel = batteryPercent;

    this.logger.log(
      'CoffeeSensorPressure - pressure: ' +
        pressureBar +
        ' bar (abs ' +
        pressureBarAbsolute +
        '), battery: ' +
        batteryPercent +
        '%',
    );

    this.setPressure(pressureBar, view.buffer, new Float32Array([pressureBar]));
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      CoffeeSensorPressure.DATA_SERVICE,
      CoffeeSensorPressure.COMBINED_CHAR,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
