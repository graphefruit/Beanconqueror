import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';

declare var ble: any;

enum SkaleMode {
  DISPLAY_CURRENT_WEIGHT = 0xec,
  LED_ON = 0xed,
  LED_OFF = 0xee,
  DISPLAY_FLASH = 0x04,
}

export class SkaleScale extends BluetoothScale {
  public static SERVICE_UUID = 'FF08';
  public static WRITE_CHAR_UUID = 'EF80';
  public static READ_CHAR_UUID = 'EF81';
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };

  constructor(data: PeripheralData) {
    super(data);
    this.connect();
  }

  public static test(device: any) {
    return (
      device && device.name && device.name.toLowerCase().startsWith('skale')
    );
  }

  public override async connect() {
    await this.attachNotification();
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    const tare = [0x10];

    await this.write(tare);
    setTimeout(() => {
      this.write(tare);
    }, 200);
  }

  public override async setLed(_on: boolean) {
    let ledOn = [0xed];
    if (!_on) {
      ledOn = [0xee];
    }

    await this.write(ledOn);
    setTimeout(() => {
      this.write(ledOn);
    }, 200);
  }
  public async flashDisplay() {
    const flash = [0x04];

    await this.write(flash);
    setTimeout(() => {
      this.write(flash);
    }, 200);
  }
  public async displayCurrentWeight() {
    const currentWeight = [0xec];

    await this.write(currentWeight);
    setTimeout(() => {
      this.write(currentWeight);
    }, 200);
  }
  public async setGrams() {
    const setGrams = [0x03];

    await this.write(setGrams);
    setTimeout(() => {
      this.write(setGrams);
    }, 200);
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
        SkaleScale.SERVICE_UUID,
        SkaleScale.WRITE_CHAR_UUID,
        new Uint8Array(_bytes).buffer,
        (e: any) => {
          resolve(true);
        },
        (e: any) => {
          resolve(false);
        }
      );
    });
  }

  private async attachNotification() {
    ble.startNotification(
      this.device_id,
      SkaleScale.SERVICE_UUID,
      SkaleScale.READ_CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(new Uint8Array(_data));
      },
      (_data: any) => {}
    );
    await this.setLed(true);
    await this.displayCurrentWeight();
    await this.setGrams();
  }

  private parseStatusUpdate(buf: Uint8Array) {
    const dataLength = buf[0];
    const manufacturerData = buf[1];
    const serviceHeader1 = buf[2];
    const serviceHeader2 = buf[3];
    const weight1 = buf[4];
    const weight2 = buf[5];
    const weight3 = buf[6];
    const weight4 = buf[7];
    // timer state is also in buffer, but currently not read by this implemenation

    this.setWeight(1 / 10);
  }
}
