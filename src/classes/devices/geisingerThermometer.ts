import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export class GeisingerThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'Geisinger Bruehthermometer';
  public static SERVICE_UUID = 'b04f237a-b949-4e36-bf48-500017b198ee';
  public static TEMPERATURE_CHAR_UUID =
    '0xD76A5CBF-5981-4AC1-B288-917872EC2449';
  public static RUNTIME_CHAR_UUID =
    'ae87a94d-ac58-4c03-ad80-6c9843facc9c'.toUpperCase();
  public static BATTERY_CHAR_UUID =
    '783de3d7-bdd3-4c77-85cb-dbd5dd0b3280'.toUpperCase();
  public static STATUS_CHAR_UUID =
    'c6b531b4-0f1d-46ff-a67c-cb0586928dc2'.toUpperCase();

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('GeisingerThermometer');
    window['geisingerThermometer'] = this;
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device &&
      device.name &&
      device.name.startsWith(GeisingerThermometer.DEVICE_NAME)
    );
  }

  public connect() {
    this.attachNotification();
  }

  public disconnect() {
    this.deattachNotification();
  }

  public override getBattery(): Promise<number> {
    return new Promise((resolve, reject) => {
      ble.read(
        this.device_id,
        GeisingerThermometer.SERVICE_UUID,
        GeisingerThermometer.BATTERY_CHAR_UUID,
        (buffer: ArrayBuffer) => {
          const data = new Uint8Array(buffer);
          if (data.byteLength === 1) {
            resolve(data[0]);
          } else {
            // Try string
            const str = String.fromCharCode.apply(null, data as any);
            const val = parseInt(str, 10);
            if (!isNaN(val)) {
              resolve(val);
            } else {
              resolve(0);
            }
          }
        },
        (err: unknown) => {
          reject(err);
        },
      );
    });
  }

  private attachNotification() {
    debugger;
    console.log('blaaa');
    ble.startNotification(
      this.device_id,
      GeisingerThermometer.SERVICE_UUID,
      GeisingerThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        this.logger.info('Parsing temp: ' + _data);
        this.parseTemperatureUpdate(new Uint8Array(_data));
      },

      (_data: any) => {
        this.logger.error('Error parsing temp: ' + JSON.stringify(_data));
      },
    );
  }

  private parseTemperatureUpdate(data: Uint8Array) {
    try {
      const text = new TextDecoder('utf-8').decode(data);
      const temp = parseFloat(text);
      if (!isNaN(temp)) {
        this.setTemperature(temp, data);
      } else {
        // Fallback logic if needed
      }
    } catch (e) {
      this.logger.error('Error parsing temp: ' + e);
    }
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      GeisingerThermometer.SERVICE_UUID,
      GeisingerThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {},
    );
  }
}
