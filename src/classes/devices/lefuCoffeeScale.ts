import { PeripheralData } from './ble.types';
import { BluetoothScale, Weight } from './bluetoothDevice';
import { Logger } from './common/logger';
import { ScaleType } from './types';

declare const ble: any;

/**
 * Lefu coffee scale (Lefu "Morre" protocol)
 *
 * OEM scale by Lefu / Shenzhen Unique Scales (model CK863), sold e.g. as
 * MiBru Smart Coffee Scale MSS226A (advertises as "MSS226A") and
 * INSMART CK863 (advertises as "863A").
 *
 * BLE UUIDs:
 *   Service:            FFF0
 *   Command char:       FFF1 (write)
 *   Notify char:        FFF3 (weight + key events)
 *   Battery:            180F / 2A19 (read only, no notify)
 *
 * All frames are TYPE LEN PAYLOAD…
 *
 * Weight frame (FFF3, ~10 Hz):
 *   12 06 [flags] 00 [w_lo] [w_hi] 05 00
 *   weight = uint16 LE in 0.1 g units
 *   flags: bit 2 (0x04) stable, bit 3 (0x08) zero, bit 4 (0x10) negative
 *   byte 6 = 0x05 observed while the scale shows grams
 *
 *   12 06 01 00 D3 01 05 00  →  46.7 g, settling
 *   12 06 05 00 D4 01 05 00  →  46.8 g, stable
 *   12 06 15 00 CF 00 05 00  → -20.7 g, stable
 *
 * Key event frame (FFF3):
 *   13 02 01 02  →  tare performed (scale button or remote tare)
 *
 * Commands (FFF1):
 *   50 00        →  tare / zero
 */
export class LefuCoffeeScale extends BluetoothScale {
  public static readonly DEVICE_NAMES = ['mss226', '863a'];

  public static readonly SERVICE_UUID = 'fff0';
  public static readonly CMD_UUID = 'fff1';
  public static readonly DATA_UUID = 'fff3';

  public static readonly BATTERY_SERVICE_UUID = '180f';
  public static readonly BATTERY_CHAR_UUID = '2a19';

  private static readonly FRAME_WEIGHT = 0x12;
  private static readonly FRAME_KEY = 0x13;

  private static readonly FLAG_STABLE = 0x04;
  private static readonly FLAG_NEGATIVE = 0x10;

  private static readonly TARE_COMMAND = [0x50, 0x00];

  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };

  private readonly logger: Logger;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.logger = new Logger('LefuCoffeeScale');
    this.supportsTaring = true;
    void this.connect();
  }

  public static test(device: any): boolean {
    const name: string | undefined = device?.name?.toLowerCase();
    if (!name) {
      return false;
    }
    return LefuCoffeeScale.DEVICE_NAMES.some((_n) => name.startsWith(_n));
  }

  public override connect(): Promise<void> {
    this.logger.log('Connecting...');
    this.attachNotification();
    this.readBattery();
    return Promise.resolve();
  }

  public override async tare(): Promise<void> {
    this.logger.log('Tare');
    await this.write(LefuCoffeeScale.TARE_COMMAND);
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachNotification();
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

  /** Visible for testing. */
  public parseNotification(_value: Uint8Array): void {
    if (_value.length < 2) {
      return;
    }

    switch (_value[0]) {
      case LefuCoffeeScale.FRAME_WEIGHT: {
        if (_value.length < 6) {
          return;
        }
        const flags = _value[2];
        const raw = _value[4] | (_value[5] << 8);
        let grams = raw / 10;
        if (flags & LefuCoffeeScale.FLAG_NEGATIVE) {
          grams = -grams;
        }
        this.setWeight(grams, (flags & LefuCoffeeScale.FLAG_STABLE) !== 0);
        break;
      }
      case LefuCoffeeScale.FRAME_KEY: {
        if (_value.length >= 4 && _value[2] === 0x01 && _value[3] === 0x02) {
          this.tareEvent.emit();
        }
        break;
      }
      default:
        break;
    }
  }

  private attachNotification() {
    ble.startNotification(
      this.device_id,
      LefuCoffeeScale.SERVICE_UUID,
      LefuCoffeeScale.DATA_UUID,
      (_data: ArrayBuffer) => {
        this.parseNotification(new Uint8Array(_data));
      },
      (_err: any) => {
        this.logger.log('Notification error: ' + JSON.stringify(_err));
      },
    );
  }

  private deattachNotification() {
    ble.stopNotification(
      this.device_id,
      LefuCoffeeScale.SERVICE_UUID,
      LefuCoffeeScale.DATA_UUID,
      () => this.logger.log('Notification stopped'),
      (_err: any) =>
        this.logger.log('Stop notification error: ' + JSON.stringify(_err)),
    );
  }

  private readBattery() {
    ble.read(
      this.device_id,
      LefuCoffeeScale.BATTERY_SERVICE_UUID,
      LefuCoffeeScale.BATTERY_CHAR_UUID,
      (_data: ArrayBuffer) => {
        const value = new Uint8Array(_data);
        if (value.length > 0) {
          this.batteryLevel = value[0];
        }
      },
      (_err: any) => {
        this.logger.log('Battery read error: ' + JSON.stringify(_err));
      },
    );
  }

  private write(_bytes: number[]): Promise<boolean> {
    return new Promise((resolve) => {
      ble.write(
        this.device_id,
        LefuCoffeeScale.SERVICE_UUID,
        LefuCoffeeScale.CMD_UUID,
        new Uint8Array(_bytes).buffer,
        () => resolve(true),
        (_err: any) => {
          this.logger.log('Write error: ' + JSON.stringify(_err));
          resolve(false);
        },
      );
    });
  }
}
