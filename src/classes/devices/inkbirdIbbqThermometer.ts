import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

/**
 * INKBIRD iBBQ-family Bluetooth BBQ thermometer.
 *
 * Covers all probe-count variants:
 *   iBBQ-1 (1 probe), iBBQ-2 (2 probes), iBBQ-4 (4 probes), iBBQ-6 (6 probes)
 * Also matches EasyBBQ/xBBQ devices which share the same protocol.
 *
 * Protocol documented by the community:
 *   https://gist.github.com/uucidl/b9c60b6d36d8080d085a8e3310621d64
 * Reference implementation:
 *   https://github.com/sworisbreathing/go-ibbq
 *
 * NOTE: This implementation is untested on physical hardware in this codebase.
 * It is based on public documentation and multiple open-source implementations
 * (Go, Python, Arduino) that agree on the protocol. A contributor with an iBBQ
 * device should verify and sign off before this is considered stable.
 *
 * BLE topology:
 *   Service:          0000fff0-0000-1000-8000-00805f9b34fb
 *   SettingsResult:   0000fff1-0000-1000-8000-00805f9b34fb  (notify — read-only)
 *   AccountVerify:    0000fff2-0000-1000-8000-00805f9b34fb  (write — credentials)
 *   RealtimeData:     0000fff4-0000-1000-8000-00805f9b34fb  (notify — temperatures)
 *   SettingsData:     0000fff5-0000-1000-8000-00805f9b34fb  (write — commands)
 *
 * Connection sequence:
 *   1. Subscribe to SettingsResult (0xfff1) notifications
 *   2. Subscribe to RealtimeData (0xfff4) notifications
 *   3. Write CREDENTIALS to AccountVerify (0xfff2) — hardcoded magic bytes,
 *      same on every known iBBQ/xBBQ device across all firmware versions
 *   4. On success, write ENABLE_REALTIME to SettingsData (0xfff5)
 *   → RealtimeData notifications begin flowing
 *
 * RealtimeData packet format:
 *   Pairs of little-endian uint16, one pair per probe.
 *   value / 10 = temperature °C.
 *   0xFFFF = probe not connected (skip, do not report).
 *
 * We report the first connected probe as the primary temperature.
 * The packet length tells us the probe count (length / 2).
 *
 * Device identification: advertises as "iBBQ" or "xBBQ".
 */
export class InkbirdIbbqThermometer extends TemperatureDevice {
  public static readonly SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
  public static readonly SETTINGS_RESULT_UUID =
    '0000fff1-0000-1000-8000-00805f9b34fb';
  public static readonly ACCOUNT_VERIFY_UUID =
    '0000fff2-0000-1000-8000-00805f9b34fb';
  public static readonly REALTIME_DATA_UUID =
    '0000fff4-0000-1000-8000-00805f9b34fb';
  public static readonly SETTINGS_DATA_UUID =
    '0000fff5-0000-1000-8000-00805f9b34fb';

  /**
   * Hardcoded credential bytes required by all known iBBQ/xBBQ devices.
   * These are the same across firmware versions; the device treats them as
   * a shared secret to confirm the client is authorised to receive data.
   */
  private static readonly CREDENTIALS = new Uint8Array([
    0x21, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0xb8, 0x22, 0x00, 0x00,
    0x00, 0x00, 0x00,
  ]);

  /** Command sent after credentials are accepted to start temperature streaming. */
  private static readonly ENABLE_REALTIME = new Uint8Array([
    0x0b, 0x01, 0x00, 0x00, 0x00, 0x00,
  ]);

  /** Sentinel value meaning "probe socket is empty / not connected". */
  private static readonly NO_PROBE = 0xffff;

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('InkbirdIbbqThermometer');
    this.connect();
  }

  public static test(device: any): boolean {
    if (!device?.name) return false;
    const lower = device.name.toLowerCase();
    return lower.includes('ibbq') || lower.includes('xbbq');
  }

  public connect(): void {
    // Step 1 — subscribe to settings result (receives ack from our writes)
    ble.startNotification(
      this.device_id,
      InkbirdIbbqThermometer.SERVICE_UUID,
      InkbirdIbbqThermometer.SETTINGS_RESULT_UUID,
      (_data: ArrayBuffer) => {
        this.logger.log('iBBQ settings result received');
        // Settings responses (battery level etc.) not yet decoded here.
      },
      (_err: any) => {
        this.logger.log('iBBQ settings result error: ' + JSON.stringify(_err));
      },
    );

    // Step 2 — subscribe to real-time temperature notifications
    ble.startNotification(
      this.device_id,
      InkbirdIbbqThermometer.SERVICE_UUID,
      InkbirdIbbqThermometer.REALTIME_DATA_UUID,
      (_data: ArrayBuffer) => {
        this.parseTemperaturePacket(new Uint8Array(_data));
      },
      (_err: any) => {
        this.logger.log('iBBQ realtime data error: ' + JSON.stringify(_err));
      },
    );

    // Step 3 — write credentials; on success enable real-time streaming
    ble.write(
      this.device_id,
      InkbirdIbbqThermometer.SERVICE_UUID,
      InkbirdIbbqThermometer.ACCOUNT_VERIFY_UUID,
      InkbirdIbbqThermometer.CREDENTIALS.buffer,
      () => {
        this.logger.log('iBBQ credentials accepted — enabling real-time data');
        // Step 4
        ble.writeWithoutResponse(
          this.device_id,
          InkbirdIbbqThermometer.SERVICE_UUID,
          InkbirdIbbqThermometer.SETTINGS_DATA_UUID,
          InkbirdIbbqThermometer.ENABLE_REALTIME.buffer,
          () => {
            this.logger.log('iBBQ real-time streaming enabled');
          },
          (_err: any) => {
            this.logger.log(
              'iBBQ enable realtime failed: ' + JSON.stringify(_err),
            );
          },
        );
      },
      (_err: any) => {
        this.logger.log(
          'iBBQ credentials write failed: ' + JSON.stringify(_err),
        );
      },
    );
  }

  public disconnect(): void {
    ble.stopNotification(
      this.device_id,
      InkbirdIbbqThermometer.SERVICE_UUID,
      InkbirdIbbqThermometer.REALTIME_DATA_UUID,
      (_e: any) => {},
      (_e: any) => {},
    );
    ble.stopNotification(
      this.device_id,
      InkbirdIbbqThermometer.SERVICE_UUID,
      InkbirdIbbqThermometer.SETTINGS_RESULT_UUID,
      (_e: any) => {},
      (_e: any) => {},
    );
  }

  private parseTemperaturePacket(data: Uint8Array): void {
    if (data.length < 2) return;

    // Each probe occupies 2 bytes (little-endian uint16).
    const numProbes = Math.floor(data.length / 2);

    for (let i = 0; i < numProbes; i++) {
      const raw = data[i * 2] | (data[i * 2 + 1] << 8);

      if (raw === InkbirdIbbqThermometer.NO_PROBE) {
        // Socket empty — skip this probe.
        continue;
      }

      const tempC = raw / 10;
      this.logger.log(`iBBQ probe ${i + 1}: ${tempC}°C`);

      // Report the first connected probe and stop.
      this.setTemperature(tempC, data);
      return;
    }
  }
}
