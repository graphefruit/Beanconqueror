import { PeripheralData } from './ble.types';
import { BluetoothScale, SCALE_TIMER_COMMAND, Weight } from './bluetoothDevice';

declare var ble: any;
export class DecentScale extends BluetoothScale {
  public static WRITE_SERVICE_UUID = 'fff0';
  public static WRITE_CHAR_UUID = '36f5';

  public static READ_SERVICE_UUID = 'fff0';
  public static READ_CHAR_UUID = 'fff4';

  public static HEADER = 0x03;
  protected override weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };
  private tareCounter: number = 0;
  private buffer: Uint8Array;

  private apiVersion: string = undefined;

  constructor(data: PeripheralData) {
    super(data);
    this.batteryLevel = 0;
    this.buffer = new Uint8Array();
    this.connect();
  }

  public static notification_callback(event: any, scale: any) {}

  public static test(device: any) {
    return (
      device && device.name && device.name.toLowerCase().startsWith('decent')
    );
  }

  public override async connect() {
    await this.setLed(true, true);
    await this.attachNotification();
  }

  public override async tare() {
    this.weight.smoothed = 0;
    this.weight.actual = 0;
    this.weight.oldSmoothed = 0;
    this.weight.old = 0;
    this.setWeight(0);

    await this.write(this.buildTareCommand());
    await setTimeout(async () => {
      await this.write(this.buildTareCommand());
    }, 200);
  }

  public override async setLed(_weightOn: boolean, _timerOn: boolean) {
    await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));

    await setTimeout(async () => {
      await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));
    }, 200);
  }

  public override async setTimer(_timer: SCALE_TIMER_COMMAND) {
    await this.write(this.buildTimerCommand(_timer));
    await setTimeout(async () => {
      await this.write(this.buildTimerCommand(_timer));
    }, 200);
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

  private getXOR(_bytes: any) {
    return (
      _bytes[0] ^ _bytes[1] ^ _bytes[2] ^ _bytes[3] ^ _bytes[4] ^ _bytes[5]
    );
  }

  private buildTareCommand() {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] = 0x0f;
    bytes[2] = 0xfd;
    bytes[3] = this.tareCounter;
    bytes[4] = 0x00;
    bytes[5] = 0x00;
    bytes[6] = this.getXOR(bytes);

    this.tareCounter++;
    if (this.tareCounter > 255) {
      this.tareCounter = 0;
    }

    return bytes;
  }

  private buildLedOnOffCommand(_weightLedOn: boolean, _timerLedOn: boolean) {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] = 0x0a;

    if (_weightLedOn) {
      bytes[2] = 0x01;
    } else {
      bytes[2] = 0x00;
    }

    if (_timerLedOn) {
      bytes[3] = 0x01;
    } else {
      bytes[3] = 0x00;
    }
    bytes[4] = 0x00;
    bytes[5] = 0x00;
    bytes[6] = this.getXOR(bytes);

    return bytes;
  }

  private buildTimerCommand(
    _timer: SCALE_TIMER_COMMAND = SCALE_TIMER_COMMAND.START
  ) {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] = 0x0b;

    if (_timer === SCALE_TIMER_COMMAND.START) {
      bytes[2] = 0x03;
    } else if (_timer === SCALE_TIMER_COMMAND.RESET) {
      bytes[2] = 0x02;
    } else {
      bytes[2] = 0x00;
    }

    bytes[3] = 0x00;
    bytes[4] = 0x00;
    bytes[5] = 0x00;
    bytes[6] = this.getXOR(bytes);

    return bytes;
  }

  private write(_bytes: Uint8Array) {
    return new Promise((resolve, reject) => {
      ble.write(
        this.device_id,
        DecentScale.WRITE_SERVICE_UUID,
        DecentScale.WRITE_CHAR_UUID,
        _bytes.buffer,
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
      DecentScale.READ_SERVICE_UUID,
      DecentScale.READ_CHAR_UUID,
      async (_data: any) => {
        if (this.apiVersion === undefined) {
          this.blueToothParentlogger.log('Determinate decent api version');
          try {
            if (_data.byteLength === 10) {
              this.blueToothParentlogger.log(
                'Determinating decent scale api version - byte length 10'
              );
              this.apiVersion = '>1.3';
              // API Version > 1.3
            } else if (_data.byteLength === 7) {
              // API version < 1.3
              this.blueToothParentlogger.log(
                'Determinating decent scale api version - byte length 7'
              );
              this.apiVersion = '<1.3';
            }
          } catch (ex) {
            this.blueToothParentlogger.log(
              'Error determinating decent scale api version'
            );
            this.apiVersion = '<1.3';
          }
        }
        const scaleData = new Int8Array(_data);
        const uScaleData = new Uint8Array(_data);
        // console.log("Received: " + scaleData[1] + " - " + scaleData[2] + " - "+ scaleData[3]);
        if (uScaleData[1] === 0xce || uScaleData[1] === 0xca) {
          // Weight notification
          let newWeight: number = ((uScaleData[2] << 8) + uScaleData[3]) / 10;

          /** We've got the issue that the Uint doesn't pass us negative values, but if we used signed, when the scale shows
           * 23 grams, the weight is -23 grams, therefore we cant make a good compromise.
           * After the scale will go up to 3200 kilos, we check the weight and if its above, we take the signed int.
           */
          if (newWeight > 3200) {
            newWeight = ((scaleData[2] << 8) + scaleData[3]) / 10;
          }
          const weightIsStable = uScaleData[1] === 0xce;
          this.setWeight(newWeight, weightIsStable);
        } else if (uScaleData[1] === 0xaa && uScaleData[2] === 0x01) {
          // Tare button pressed.
          //this.tareEvent.emit();
          //await this.tare();
        } else if (uScaleData[1] === 0xaa && uScaleData[2] === 0x02) {
          // Timer button pressed
          this.timerEvent.emit(null);
        }
      },
      (_data: any) => {}
    );
  }

  private async deattachNotification() {
    ble.stopNotification(
      this.device_id,
      DecentScale.READ_SERVICE_UUID,
      DecentScale.READ_CHAR_UUID,
      (e: any) => {},
      (e: any) => {}
    );
  }
}
