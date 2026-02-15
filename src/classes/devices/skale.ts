import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';
import { ScaleType, sleep } from './index';

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
    notMutatedWeight: 0,
  };

  constructor(data: PeripheralData, type: ScaleType) {
    super(data, type);
    this.connect();
  }

  public static test(device: any) {
    return (
      device && device.name && device.name.toLowerCase().startsWith('skale')
    );
  }

  public override async connect() {
    this.attachNotification();
    // We need to put LED on on first conneciton, aswell as starting the current weight and toggling mode to grams.
    this.setLed(true);
    await sleep(100);
    this.displayCurrentWeight();
    await sleep(100);
    this.setGrams();
  }

  public override tare(): void {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    const tare = [0x10];

    this.write(tare);
    setTimeout(() => {
      this.write(tare);
    }, 200);
  }

  public override setLed(_on: boolean): void {
    let ledOn = [0xed];
    if (!_on) {
      ledOn = [0xee];
    }

    this.write(ledOn);
    setTimeout(() => {
      this.write(ledOn);
    }, 200);
  }
  public flashDisplay(): void {
    const flash = [0x04];

    this.write(flash);
    setTimeout(() => {
      this.write(flash);
    }, 200);
  }
  public displayCurrentWeight(): void {
    const currentWeight = [0xec];

    this.write(currentWeight);
    setTimeout(() => {
      this.write(currentWeight);
    }, 200);
  }
  public setGrams(): void {
    const setGrams = [0x03];

    this.write(setGrams);
    setTimeout(() => {
      this.write(setGrams);
    }, 200);
  }

  public override setTimer(_timer: SCALE_TIMER_COMMAND): void {
    //Not supported but needed
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
    ble.write(
      this.device_id,
      SkaleScale.SERVICE_UUID,
      SkaleScale.WRITE_CHAR_UUID,
      new Uint8Array(_bytes).buffer,
      (e: any) => {},
      (e: any) => {},
    );
  }

  private attachNotification(): void {
    ble.startNotification(
      this.device_id,
      SkaleScale.SERVICE_UUID,
      SkaleScale.READ_CHAR_UUID,
      async (_data: any) => {
        this.parseStatusUpdate(_data);
      },
      (_data: any) => {},
    );
  }

  private parseStatusUpdate(_data: any) {
    const scaleData = new Int8Array(_data);
    const uScaleData = new Uint8Array(_data);
    let newWeight = (uScaleData[2] << 8) + uScaleData[1];
    if (newWeight > 2001) {
      newWeight = (scaleData[2] << 8) + scaleData[1];
    }

    this.setWeight(newWeight / 10);
  }
}
