import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';

import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;
declare var device: any;
import { AdvertisementDecoder } from 'ble-central-advertisements';
export class CombustionThermometer extends TemperatureDevice {
  public static DEVICE_NAME = 'Combustion Inc';
  public static TEMPERATURE_SERVICE_UUID =
    '00000100-CAAB-3792-3D44-97AE51C1407A';
  public static TEMPERATURE_CHAR_UUID = '00000101-CAAB-3792-3D44-97AE51C1407A';

  private logger: Logger;
  public bitsPerTemperature = 13;
  constructor(data: PeripheralData) {
    super(data);
    this.connect();
    this.logger = new Logger('CombustionTemperatureSensor');
  }

  public static test(bleDevice: any): boolean {
    try {
      if (device !== null && device.platform === 'iOS') {
        try {
          if (
            bleDevice &&
            bleDevice.advertising.kCBAdvDataServiceUUIDs.indexOf(
              '00000100-CAAB-3792-3D44-97AE51C1407A'
            ) >= 0
          ) {
            return true;
          } else {
            return false;
          }
        } catch (ex2) {
          return false;
        }
      } else {
        const decoder = new AdvertisementDecoder();
        const parsed = decoder.decode(bleDevice.advertising);
        if (
          parsed.advDataManufacturerId === 2503 &&
          parsed.advDataManufacturerPayload[0] === 1
        ) {
          return true;
        }
      }
    } catch (ex) {}
    return false;
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
      CombustionThermometer.TEMPERATURE_SERVICE_UUID,
      CombustionThermometer.TEMPERATURE_CHAR_UUID,

      async (_data: any) => {
        const data = new Uint8Array(_data);

        this.parseStatusUpdate(data);
      },
      async (_data: any) => {
        console.log(_data);
      }
    );
  }

  private parseStatusUpdate(temperatureRawStatus: Uint8Array) {
    const lograngeArray = new Uint32Array(
      temperatureRawStatus.slice(0, 8).buffer
    );

    /**
     * Parsing
     */
    const logrange = {
      min: lograngeArray[0],
      max: lograngeArray[1],
    };

    const temperatures = this.readTemperatures(
      temperatureRawStatus.slice(8, 21)
    );

    const modeByte = temperatureRawStatus[21];

    const modeAndID = {
      mode: (modeByte >> 0) & 0b11,
      color: (modeByte >> 2) & 0b111,
      id: (modeByte >> 5) & 0b111,
    };

    const battery = temperatureRawStatus[22] & 0b01;
    const virtualSensors = {
      coreIndex: (temperatureRawStatus[22] >> 1) & 0b111,
      surfaceIndex: (temperatureRawStatus[22] >> 4) & 0b11,
      ambientIndex: (temperatureRawStatus[22] >> 6) & 0b11,
      core: undefined,
      surface: undefined,
      ambient: undefined,
    };
    virtualSensors.core = temperatures[virtualSensors.coreIndex];
    virtualSensors.surface = temperatures[virtualSensors.surfaceIndex];
    virtualSensors.ambient = temperatures[virtualSensors.ambientIndex];

    this.logger.log(
      'temperatureRawStatus received is: ' + temperatureRawStatus
    );

    this.setTemperature(virtualSensors.core, temperatureRawStatus);
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      CombustionThermometer.TEMPERATURE_SERVICE_UUID,
      CombustionThermometer.TEMPERATURE_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }

  public convertToTemperature(raw) {
    const convert = raw * 0.05 - 20;
    // Round to 0.05
    const rounded = Math.round(convert * 200) / 200;
    return rounded;
  }

  public readTemperatures(uint8Array) {
    let result = [];
    let buffer = 0;
    let bufferLength = 0;

    // Push a byte to the buffer, see if we have a full temperature, if so remove it from the end of the buffer leaving some bits for the next byte
    for (let i = 0; i < uint8Array.length; i++) {
      // The new 8 bits are going in the front, our previous bit go in the end of the new value
      buffer = (uint8Array[i] << bufferLength) | buffer;
      // We consumed 1 byte / 8 bit
      bufferLength += 8;

      // Do we have a full temperature value?
      if (bufferLength >= this.bitsPerTemperature) {
        // consume the last 13 bits and store in the temperature array
        const value = (buffer &= (1 << this.bitsPerTemperature) - 1);
        result.push(this.convertToTemperature(value));

        // remove the last 13 bit
        buffer = buffer >> this.bitsPerTemperature;
        bufferLength -= this.bitsPerTemperature;
      }
    }

    return result;
  }
}
