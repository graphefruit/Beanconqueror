import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

/**
 * INKBIRD INT-11I-B Bluetooth food thermometer.
 *
 * Protocol verified by nRF Connect capture (2026-06-16), and the full
 * integration tested end-to-end on physical hardware on Android:
 * device scan, connect, and live temperature in the brew graph.
 *
 * BLE topology:
 *   Service:               0000ff00-0000-1000-8000-00805f9b34fb
 *   Notify characteristic: 0000ff01-0000-1000-8000-00805f9b34fb
 *   Battery:               Standard 0x2A19 (base class handles it)
 *
 * Packet format — 3 bytes, ~1 Hz at rest, ~1 Hz during rapid change:
 *   byte[0]: unknown (rolling counter or status byte)
 *   byte[1]: ambient/handle sensor temperature, whole °C
 *   byte[2]: food probe tip temperature, whole °C
 *
 * We report byte[2] (food probe) as the primary temperature.
 *
 * Device identification: advertised BLE name is "INKBIRD".
 * To avoid matching other INKBIRD devices (e.g. humidity sensors that
 * also use that name), we additionally check for the 0xff00 service
 * UUID in the scan advertisement when that data is available.
 */
export class InkbirdInt11IBThermometer extends TemperatureDevice {
  public static readonly DEVICE_NAME = 'INKBIRD';
  public static readonly DEVICE_NAME_ALT = 'INT-11I-B';
  public static readonly SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
  public static readonly TEMP_CHAR_UUID =
    '0000ff01-0000-1000-8000-00805f9b34fb';

  private static readonly PACKET_MIN_LENGTH = 3;

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('InkbirdInt11IBThermometer');
    this.connect();
  }

  /**
   * Match "INKBIRD" by name, preferring a service-UUID confirmation when
   * scan advertising data includes a service list.
   */
  public static test(device: any): boolean {
    if (!device?.name) return false;
    const upper = device.name.toUpperCase();
    const nameMatch =
      upper === InkbirdInt11IBThermometer.DEVICE_NAME ||
      upper === InkbirdInt11IBThermometer.DEVICE_NAME_ALT;
    if (!nameMatch) return false;
    // If the scan result includes advertised service UUIDs, require ours.
    if (Array.isArray(device.services) && device.services.length > 0) {
      return device.services.some(
        (s: string) =>
          s.toLowerCase() === InkbirdInt11IBThermometer.SERVICE_UUID,
      );
    }
    // No service list in scan data — fall back to name match alone.
    return true;
  }

  public connect(): void {
    this.attachNotification();
  }

  public disconnect(): void {
    this.detachNotification();
  }

  private attachNotification(): void {
    ble.startNotification(
      this.device_id,
      InkbirdInt11IBThermometer.SERVICE_UUID,
      InkbirdInt11IBThermometer.TEMP_CHAR_UUID,
      (_data: ArrayBuffer) => {
        this.parsePacket(new Uint8Array(_data));
      },
      (_err: any) => {
        this.logger.log(
          'InkbirdInt11IB notification error: ' + JSON.stringify(_err),
        );
      },
    );
  }

  private parsePacket(data: Uint8Array): void {
    if (data.length < InkbirdInt11IBThermometer.PACKET_MIN_LENGTH) {
      return;
    }
    // byte[0] = unknown (counter / status — do not interpret as temperature)
    // byte[1] = ambient sensor (handle end), whole °C
    // byte[2] = food probe tip, whole °C  ← primary reading
    const probeTemp = data[2];
    const ambientTemp = data[1];
    this.logger.log(
      `INT-11I-B  probe=${probeTemp}°C  ambient=${ambientTemp}°C`,
    );
    this.setTemperature(probeTemp, data);
  }

  private detachNotification(): void {
    ble.stopNotification(
      this.device_id,
      InkbirdInt11IBThermometer.SERVICE_UUID,
      InkbirdInt11IBThermometer.TEMP_CHAR_UUID,
      (_e: any) => {},
      (_e: any) => {},
    );
  }
}
