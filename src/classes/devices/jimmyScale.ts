import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { ScaleType, sleep } from './index';

declare var ble: any;

enum JimmyUnit {
  GRAMM = 'g',
  OUNCE = 'oz',
}
enum JimmyMode {
  SCALE_ONLY = 0x01,
  TIMER_SCALE = 0x02,
  POUR_OVER = 0x03,
  ESPRESSO_1 = 0x04,
  ESPRESSO_2 = 0x05,
  ESPRESSO_3 = 0x06,
}

export class JimmyScale extends BluetoothScale {
  public static SERVICE_UUID = '06c31822-8682-4744-9211-febc93e3bece';
  public static WRITE_CHAR_UUID = '06c31823-8682-4744-9211-febc93e3bece';
  public static READ_CHAR_UUID = '06c31824-8682-4744-9211-febc93e3bece';
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
    notMutatedWeight: 0,
  };
  private unit?: JimmyUnit = undefined;
  private mode?: JimmyMode = undefined;

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.connect();
  }

  public static test(device: any) {
    return (
      device && device.name && device.name.toLowerCase().startsWith('hiroia')
    );
  }

  public override async connect() {
    await this.attachNotification();
    await sleep(500);
    await this.setUnit(JimmyUnit.GRAMM);
    await this.setMode(JimmyMode.SCALE_ONLY);
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    const tare = [0x07, 0x00];

    await this.write(tare);
    setTimeout(() => {
      this.write(tare);
    }, 200);
  }

  public override async setLed(_weightOn: boolean, _timerOn: boolean) {
    // no led on jimmy
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    // Jimmy scale only supports a toggle timer command [0x05, 0x00]
    // therefore we don't use its timer to avoid drift between scale timer and app timer state in case of conn problems
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

  private write(_bytes: number[]) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        JimmyScale.SERVICE_UUID,
        JimmyScale.WRITE_CHAR_UUID,
        new Uint8Array(_bytes).buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          resolve(false);
        },
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      JimmyScale.SERVICE_UUID,
      JimmyScale.READ_CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {},
    );
  }

  private parseStatusUpdate(buf: Uint8Array) {
    const mode = buf[0];
    const sign = buf[6];
    const msw = buf[5];
    const lsw = buf[4];

    // timer state is also in buffer, but currently not read by this implemenation

    let weight = 256 * msw + lsw;

    if (sign === 255)
      // negative weight
      weight = (65536 - weight) * -1;

    if (mode > 0x08) {
      this.unit = JimmyUnit.OUNCE;
      this.setWeight(weight / 1000);
      this.mode = mode - 0x08;
    } else {
      this.unit = JimmyUnit.GRAMM;
      this.setWeight(weight / 10);
      this.mode = mode;
    }
  }

  private async toggleUnit() {
    const toggleUnit = [0x0b, 0x00];
    await this.write(toggleUnit);
  }

  private async toggleMode() {
    const toggleMode = [0x04, 0x00];
    await this.write(toggleMode);
  }

  private async setUnit(unit: JimmyUnit) {
    if (this.unit !== unit) {
      await this.toggleUnit();
      await setTimeout(() => this.setUnit(unit), 250);
    }
  }

  private async setMode(mode: JimmyMode) {
    if (this.mode !== mode) {
      await this.toggleMode();
      await setTimeout(() => this.setMode(mode), 250);
    }
  }
}
