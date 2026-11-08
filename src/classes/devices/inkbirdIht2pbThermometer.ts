import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

/**
 * INKBIRD IHT-2PB multi-probe Bluetooth thermometer.
 *
 * Protocol verified against hardware (firmware VER1.2.0) by the
 * inkbird-ble Home Assistant parser community (issue #222,
 * reference decoder: https://github.com/quittung/iht2pb):
 * https://github.com/Bluetooth-Devices/inkbird-ble
 *
 * The device supports up to 3 probes. We report probe 1 as the
 * primary temperature; probes 2 and 3 are parsed and logged but
 * not yet surfaced through the TemperatureDevice interface.
 *
 * BLE topology:
 *   Service:  0000ffe0-0000-1000-8000-00805f9b34fb
 *   Notify:   0000ffe4-0000-1000-8000-00805f9b34fb
 *   Write:    0000ffe9-0000-1000-8000-00805f9b34fb
 *
 * Activation sequence (after subscribing to notifications):
 *   Write 55 AA 19 01 00 19  →  0xffe9  (enable command 1)
 *   Write 55 AA 1A 01 00 1A  →  0xffe4  (enable command 2, best-effort:
 *                                         device rejects the write but
 *                                         the stream still starts)
 *
 * Frame format — notifications may bundle multiple frames back-to-back:
 *   55 AA <cmd> <len> <payload[len]> <checksum>
 *   checksum = sum(all bytes before checksum) & 0xFF
 *
 * Temperature frame commands (Celsius):
 *   0x02 = probe 1,  0x04 = probe 2,  0x06 = probe 3
 *   payload: signed 16-bit big-endian, units = tenths of °C
 *
 * Device identification: advertises as "Ink@IHT-2PB#<suffix>" or similar.
 */
export class InkbirdIht2pbThermometer extends TemperatureDevice {
  public static readonly DEVICE_NAME_PREFIX = 'ink@iht-2pb';
  public static readonly SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
  public static readonly NOTIFY_CHAR_UUID =
    '0000ffe4-0000-1000-8000-00805f9b34fb';
  public static readonly WRITE_CHAR_UUID =
    '0000ffe9-0000-1000-8000-00805f9b34fb';

  /** Activation bytes written to WRITE_CHAR after subscribing. */
  private static readonly INIT_CMD_1 = new Uint8Array([
    0x55, 0xaa, 0x19, 0x01, 0x00, 0x19,
  ]);
  /**
   * Second activation write targets the notify characteristic itself.
   * The device rejects it (write-not-permitted) but the temperature
   * stream still starts, so the error is swallowed intentionally.
   */
  private static readonly INIT_CMD_2 = new Uint8Array([
    0x55, 0xaa, 0x1a, 0x01, 0x00, 0x1a,
  ]);

  /** Frame header bytes. */
  private static readonly FRAME_HEADER_0 = 0x55;
  private static readonly FRAME_HEADER_1 = 0xaa;

  /** Minimum bytes to form a valid frame: header(2)+cmd(1)+len(1)+checksum(1). */
  private static readonly FRAME_MIN_LEN = 5;

  /** Map from frame command byte to probe number (1-indexed). */
  private static readonly PROBE_COMMANDS: Record<number, number> = {
    0x02: 1,
    0x04: 2,
    0x06: 3,
  };

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('InkbirdIht2pbThermometer');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device?.name &&
      device.name
        .toLowerCase()
        .startsWith(InkbirdIht2pbThermometer.DEVICE_NAME_PREFIX)
    );
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
      InkbirdIht2pbThermometer.SERVICE_UUID,
      InkbirdIht2pbThermometer.NOTIFY_CHAR_UUID,
      (_data: ArrayBuffer) => {
        this.parseNotification(new Uint8Array(_data));
      },
      (_err: any) => {
        this.logger.log('IHT-2PB notification error: ' + JSON.stringify(_err));
      },
    );

    // Send activation commands to start the temperature stream.
    this.bestEffortWrite(
      InkbirdIht2pbThermometer.WRITE_CHAR_UUID,
      InkbirdIht2pbThermometer.INIT_CMD_1,
    );
    // Second write is deliberately best-effort; device rejects it but needs it.
    this.bestEffortWrite(
      InkbirdIht2pbThermometer.NOTIFY_CHAR_UUID,
      InkbirdIht2pbThermometer.INIT_CMD_2,
    );
  }

  /** Write without response, swallowing any error. */
  private bestEffortWrite(charUuid: string, payload: Uint8Array): void {
    ble.writeWithoutResponse(
      this.device_id,
      InkbirdIht2pbThermometer.SERVICE_UUID,
      charUuid,
      payload.buffer,
      (_: any) => {},
      (_: any) => {}, // expected to fail for NOTIFY_CHAR; ignore
    );
  }

  /**
   * Walk the notification buffer parsing all complete frames.
   * Reports the temperature for probe 1 when found.
   */
  private parseNotification(data: Uint8Array): void {
    let i = 0;
    while (i + InkbirdIht2pbThermometer.FRAME_MIN_LEN <= data.length) {
      // Re-sync to 55 AA header
      if (
        data[i] !== InkbirdIht2pbThermometer.FRAME_HEADER_0 ||
        data[i + 1] !== InkbirdIht2pbThermometer.FRAME_HEADER_1
      ) {
        i++;
        continue;
      }

      const command = data[i + 2];
      const payloadLen = data[i + 3];
      const checksumIdx = i + 4 + payloadLen;

      if (checksumIdx >= data.length) {
        // Declared length overruns the buffer — truncated frame, stop.
        break;
      }

      // Verify checksum: sum of all bytes before it, mod 256.
      let sum = 0;
      for (let k = i; k < checksumIdx; k++) {
        sum += data[k];
      }
      if ((sum & 0xff) !== data[checksumIdx]) {
        // Checksum mismatch — re-sync one byte forward.
        i++;
        continue;
      }

      // Valid frame — decode temperature probes.
      const probeNum = InkbirdIht2pbThermometer.PROBE_COMMANDS[command];
      if (probeNum !== undefined && payloadLen >= 2) {
        // Signed 16-bit big-endian, tenths of °C.
        const raw = (data[i + 4] << 8) | data[i + 5];
        const signed = raw > 0x7fff ? raw - 0x10000 : raw;
        const tempC = signed / 10;

        this.logger.log(`IHT-2PB probe ${probeNum}: ${tempC}°C`);

        if (probeNum === 1) {
          this.setTemperature(tempC, data);
        }
      }

      i = checksumIdx + 1;
    }
  }

  private detachNotification(): void {
    ble.stopNotification(
      this.device_id,
      InkbirdIht2pbThermometer.SERVICE_UUID,
      InkbirdIht2pbThermometer.NOTIFY_CHAR_UUID,
      (_e: any) => {},
      (_e: any) => {},
    );
  }
}
