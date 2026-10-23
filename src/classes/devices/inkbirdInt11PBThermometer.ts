import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

/**
 * INKBIRD INT-11P-B Bluetooth food thermometer.
 *
 * Protocol decoded by the inkbird-ble Home Assistant community parser:
 * https://github.com/Bluetooth-Devices/inkbird-ble (issue #41)
 * Untested on hardware in this codebase; widely verified externally.
 *
 * Unlike the INT-11I-B, this device does NOT push BLE notifications.
 * Readings must be obtained by polling (GATT Read) the data characteristic.
 *
 * BLE topology:
 *   Service:              0000fff0-0000-1000-8000-00805f9b34fb
 *   Read characteristic:  0000fff1-0000-1000-8000-00805f9b34fb
 *   Battery:              Standard 0x2A19 (base class handles it)
 *
 * Packet format — 7 bytes:
 *   byte[0]: 0xAA (fixed header)
 *   byte[1]: probe (tip) temperature, whole °C  ← primary reading
 *   byte[2]: flags (bit 7 = probe charging)
 *   byte[3]: ambient temperature, whole °C (0 = not available)
 *   byte[4]: probe battery %; low 7 bits = %, bit 7 = flag
 *   byte[5]: case battery %; bits 7–1 >> 1 = %, bit 0 = charging flag
 *   byte[6]: unknown
 *
 * Device identification: advertises as "INT-11P-B".
 */
export class InkbirdInt11PBThermometer extends TemperatureDevice {
  public static readonly DEVICE_NAME = 'INT-11P-B';
  public static readonly SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
  public static readonly DATA_CHAR_UUID =
    '0000fff1-0000-1000-8000-00805f9b34fb';

  /** Poll interval during an active brew session. */
  private static readonly POLL_INTERVAL_MS = 1000;
  private static readonly PACKET_HEADER = 0xaa;
  private static readonly PACKET_MIN_LENGTH = 6;
  private static readonly PROBE_BATTERY_MASK = 0x7f;

  private logger: Logger;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('InkbirdInt11PBThermometer');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device?.name?.toLowerCase() ===
      InkbirdInt11PBThermometer.DEVICE_NAME.toLowerCase()
    );
  }

  public connect(): void {
    this.startPolling();
  }

  public disconnect(): void {
    this.stopPolling();
  }

  private startPolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = setInterval(() => {
      ble.read(
        this.device_id,
        InkbirdInt11PBThermometer.SERVICE_UUID,
        InkbirdInt11PBThermometer.DATA_CHAR_UUID,
        (_data: ArrayBuffer) => {
          this.parsePacket(new Uint8Array(_data));
        },
        (_err: any) => {
          this.logger.log('INT-11P-B read error: ' + JSON.stringify(_err));
        },
      );
    }, InkbirdInt11PBThermometer.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private parsePacket(data: Uint8Array): void {
    if (
      data.length < InkbirdInt11PBThermometer.PACKET_MIN_LENGTH ||
      data[0] !== InkbirdInt11PBThermometer.PACKET_HEADER
    ) {
      return;
    }

    const probeTemp = data[1];
    const ambientTemp = data[3]; // 0 means "not available"
    const probeBattery = data[4] & InkbirdInt11PBThermometer.PROBE_BATTERY_MASK;
    const caseBattery = data[5] >> 1;

    this.batteryLevel = probeBattery;

    this.logger.log(
      `INT-11P-B  probe=${probeTemp}°C  ambient=${ambientTemp}°C` +
        `  probeBat=${probeBattery}%  caseBat=${caseBattery}%`,
    );

    this.setTemperature(probeTemp, data);
  }
}
