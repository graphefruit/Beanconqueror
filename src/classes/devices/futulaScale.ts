import { PeripheralData } from './ble.types';
import { BluetoothScale, Weight } from './bluetoothDevice';
import { ScaleType } from './index';
import { Logger } from './common/logger';

declare var ble: any;

export class FutulaScale extends BluetoothScale {
  public static readonly DEVICE_NAME = 'LFSmart Scale';
  public static readonly DEVICE_NAME_SECOND = 'lefu';

  public static readonly SCALE_SERVICE = 'fff0';
  public static readonly COMMAND_CHARACTERISTIC = 'fff1';
  public static readonly WEIGHT_CHARACTERISTIC = 'fff4';

  public static readonly BATTERY_SERVICE = '180f';
  public static readonly BATTERY_CHARACTERISTIC = '2a19';

  // Commands (hex)
  private static readonly RESET_COMMAND = 'fd320000000000000000cf';
  private static readonly UNIT_GRAM_COMMAND = 'fd000400000000000000f9';

  // Constructor
  public override batteryLevel: number;
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
    this.logger = new Logger('FutulaScale');
    this.supportsTaring = false;

    this.connect();
  }

  // Accessors

  /**
   * Checks if this class supports interaction with @param device.
   * @param device The device being checked for support.
   * @returns boolean If support is provided for device.
   */
  public static test(device: any): boolean {
    const name = device?.name?.toLowerCase();
    if (!name) return false;

    return (
      name.includes(this.DEVICE_NAME.toLowerCase()) ||
      name.includes(this.DEVICE_NAME_SECOND.toLowerCase())
    );
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

  // Public Methods

  public override async connect() {
    this.logger.log('Connecting...');

    await this.attachWeightNotification();
    this.attachBatteryNotificationOrRead();
    await this.sendHexCommand(FutulaScale.UNIT_GRAM_COMMAND);
  }

  public override async tare() {
    this.logger.log('Tare/reset');
    await this.sendHexCommand(FutulaScale.RESET_COMMAND);
  }

  public override disconnectTriggered(): void {
    this.logger.log('Disconnecting...');
    this.deattachWeightNotification();
    this.deattachBatteryNotification();
  }

  // BLE helpers
  private sendHexCommand(hex: string): Promise<boolean> {
    const bytes = FutulaScale.hexToBytes(hex);
    return new Promise((resolve) => {
      ble.write(
        this.device_id,
        FutulaScale.SCALE_SERVICE,
        FutulaScale.COMMAND_CHARACTERISTIC,
        bytes.buffer,
        () => resolve(true),
        () => resolve(false),
      );
    });
  }

  private async attachWeightNotification() {
    ble.startNotification(
      this.device_id,
      FutulaScale.SCALE_SERVICE,
      FutulaScale.WEIGHT_CHARACTERISTIC,
      (_data: any) => {
        this.parseWeightUpdate(new Uint8Array(_data));
      },
      (_err: any) => {
        // optional log
      },
    );
  }

  private deattachWeightNotification() {
    ble.stopNotification(
      this.device_id,
      FutulaScale.SCALE_SERVICE,
      FutulaScale.WEIGHT_CHARACTERISTIC,
      () => {},
      () => {},
    );
  }

  private attachBatteryNotificationOrRead() {
    try {
      ble.startNotification(
        this.device_id,
        FutulaScale.BATTERY_SERVICE,
        FutulaScale.BATTERY_CHARACTERISTIC,
        (_data: any) => {
          const v = new Uint8Array(_data);
          if (v.length > 0) {
            this.batteryLevel = v[0];
          }
        },
        (_err: any) => {
          this.logger?.debug?.('Battery notification error callback', _err);
        },
      );
    } catch (e) {
      this.logger?.debug?.('Battery notification error callback', e);
    }
  }

  private deattachBatteryNotification() {
    try {
      ble.stopNotification(
        this.device_id,
        FutulaScale.BATTERY_SERVICE,
        FutulaScale.BATTERY_CHARACTERISTIC,
        () => {},
        () => {},
      );
    } catch (e) {
      this.logger?.debug?.('deattachBatteryNotification error', e);
    }
  }

  // parsing
  private parseWeightUpdate(value: Uint8Array) {
    if (value.length < 9) return;

    const isNegative = value[5] > 0;
    const sign = isNegative ? -1 : 1;

    const raw = (value[4] << 8) | value[3];
    const grams = sign * (raw / 10);

    this.setWeight(grams);
  }

  private static hexToBytes(hex: string): Uint8Array {
    const clean = hex.replace(/\s+/g, '');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
}
