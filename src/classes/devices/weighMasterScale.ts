import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './types';

declare var ble: any;

/**
 * WeighMaster (ECS-02) Bluetooth Scale
 *
 * BLE UUIDs:
 *   Service:          FFF0
 *   Write char:       FFF1
 *   Notify char:      FFF4
 *
 * Packet format (7 bytes):
 *   01 02 00 [status] [weight_h] [weight_m] [weight_l]
 *
 * Status byte (byte 3):
 *   bit 7 (0x80) → stable
 *   bit 4 (0x10) → negative
 *   bit 3 (0x08) → calibration in progress
 *   bit 2 (0x04) → calibration success
 *
 * Weight is a 24-bit unsigned integer in units of 0.1 g.
 *
 * Example:
 *   01 02 00 80 00 03 E8  → +100.0 g (stable)
 *   01 02 00 90 00 03 E8  → -100.0 g (stable)
 */
export class WeighMasterScale extends BluetoothScale {
  public static DEVICE_NAME = 'weighmaster';
  public static SERVICE_UUID = 'FFF0';
  /** Notify characteristic – weight data */
  public static CHAR_UUID = 'FFF4';
  /** Write characteristic – commands (tare, timer, …) */
  public static CMD_UUID = 'FFF1';

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  private logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('WeighMaster Scale');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device?.name?.toLowerCase().includes(this.DEVICE_NAME) ||
      device?.name?.toLowerCase().includes('mantabrew') ||
      false
    );
  }

  public override async connect() {
    this.logger.log('connecting...');
    await this.attachNotification();
  }

  public override async tare(): Promise<void> {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    // Tare command: byte sequence for ECS-02
    await this.write(new Uint8Array([0x02]));

    // ECS-02 typically needs a short buzzer beep (05 00) after tare
    setTimeout(() => {
      this.sendBuzzerCommand().catch((e) => {
        this.logger.log(
          '[ECS-02] Sending supplemental buzzer command failed: ' +
            JSON.stringify(e),
        );
      });
    }, 300);
  }

  /**
   * Send short buzzer command
   */
  public async sendBuzzerCommand(): Promise<void> {
    await this.write(new Uint8Array([0x05, 0x00]));
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    this.logger.log('Setting Timer command ' + _timer + '...');
    if (_timer === SCALE_TIMER_COMMAND.START) {
      await this.write(
        new Uint8Array([0x52, 0x0b, 0x01, 0x00, 0x00, 0x00, 0x00]),
      );
    } else if (_timer === SCALE_TIMER_COMMAND.STOP) {
      await this.write(
        new Uint8Array([0x52, 0x0b, 0x00, 0x00, 0x00, 0x00, 0x00]),
      );
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      await this.write(
        new Uint8Array([0x52, 0x0b, 0x02, 0x00, 0x00, 0x00, 0x00]),
      );
    }
  }

  public override getWeight() {
    return this.weight.actual;
  }

  public override getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public override getOldSmoothedWeight() {
    return this.weight.old;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private write(_bytes: Uint8Array): Promise<boolean> {
    return new Promise((resolve) => {
      ble.writeWithoutResponse(
        this.device_id,
        WeighMasterScale.SERVICE_UUID,
        WeighMasterScale.CMD_UUID,
        _bytes.buffer,
        () => {
          resolve(true);
        },
        (e: any) => {
          this.logger.log('Write error', e);
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    this.logger.logDirect('Attaching notification...');
    ble.startNotification(
      this.device_id,
      WeighMasterScale.SERVICE_UUID,
      WeighMasterScale.CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {
        this.logger.logDirect('Attaching notification, error', _data);
      },
    );
  }

  /**
   * Parses the 7-byte ECS-02 packet:
   *   01 02 00 [status] [weight_h] [weight_m] [weight_l]
   *
   * Weight resolution: 0.1 g  →  divide raw value by 10.
   */
  private parseStatusUpdate(raw: Uint8Array) {
    // Minimum packet length guard
    if (raw.length < 7) {
      return;
    }
    // Header check: byte[0] === 0x01, byte[1] === 0x02
    if (raw[0] !== 0x01 || raw[1] !== 0x02) {
      return;
    }

    const status = raw[3];

    const isStable = (status & 0x80) !== 0;
    const isNegative = (status & 0x10) !== 0;

    // 24-bit unsigned weight
    const rawWeight = (raw[4] << 16) | (raw[5] << 8) | raw[6];
    const weightInGrams = (isNegative ? -rawWeight : rawWeight) / 10;

    if (!isNaN(weightInGrams)) {
      this.setWeight(weightInGrams, isStable);
    }
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      WeighMasterScale.SERVICE_UUID,
      WeighMasterScale.CHAR_UUID,
      (e: any) => {
        this.logger.logDirect('Deattaching notification, success', e);
      },
      (e: any) => {
        this.logger.logDirect('Deattaching notification, error', e);
      },
    );
  }
}
