import { Platforms } from '@ionic/core';
import {PeripheralData} from './ble.types';
import {BluetoothScale, SCALE_TIMER_COMMAND, Weight} from './bluetoothDevice';
import {EventEmitter} from '@angular/core';

declare var ble;
export default class DecentScale extends BluetoothScale {
  public static WRITE_SERVICE_UUID = 'fff0';
  public static WRITE_CHAR_UUID = '36f5';

  public static READ_SERVICE_UUID = 'fff0';
  public static READ_CHAR_UUID = 'fff4';


  public static HEADER = 0x03;

  private tareCounter: number = 0;
  private buffer: Uint8Array;

  protected weight: Weight = {
    actual: 0,
    old: 0,
    smoothed: 0,
    oldSmoothed: 0,
  };

  public static notification_callback(event, scale) {

  }

  public static test(device) {
    return device && device.name && device.name.toLowerCase().startsWith('decent');
  }

  constructor(data: PeripheralData, platforms: Platforms[]) {
    super(data, platforms);
    this.batteryLevel = 0;
    this.buffer = new Uint8Array();
    this.connect();
  }

  private getXOR(_bytes) {
    return _bytes[0] ^ _bytes[1] ^ _bytes[2] ^ _bytes[3] ^ _bytes[4] ^ _bytes[5];
  }

  private buildTareCommand() {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] = 0x0F;
    bytes[2] = 0xFD;
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

    bytes[1] = 0x0A;

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

  private buildTimerCommand(_timer: SCALE_TIMER_COMMAND = SCALE_TIMER_COMMAND.START) {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] = 0x0B;

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


  public async connect() {
    await this.setLed(true, true);
    await this.attachNotification();
  }

  private write(_bytes: Uint8Array) {
    return new Promise((resolve, reject) => {
      ble.write(this.device_id,
        DecentScale.WRITE_SERVICE_UUID,
        DecentScale.WRITE_CHAR_UUID,
        _bytes.buffer,
        (e) => {
          resolve(true);
        }, (e) => {
          resolve(false);
        });
    });
  }

  public async tare() {
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

  public async setLed(_weightOn: boolean, _timerOn: boolean) {
    await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));

    await setTimeout(async () => {
      await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));
    }, 200);
  }


  public async setTimer(_timer: SCALE_TIMER_COMMAND) {
    await this.write(this.buildTimerCommand(_timer));
    await setTimeout(async () => {
      await this.write(this.buildTimerCommand(_timer));
    }, 200);
  }

  public getWeight() {
    return this.weight.actual;
  }

  public getSmoothedWeight() {
    return this.weight.smoothed;
  }

  public getOldSmoothedWeight() {
    return this.weight.old;
  }

  private async attachNotification() {
    ble.startNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      async (_data) => {
        const scaleData = new Int8Array(_data);
        const uScaleData = new Uint8Array(_data);
        // console.log("Received: " + scaleData[1] + " - " + scaleData[2] + " - "+ scaleData[3]);
        if (uScaleData[1] === 0xCE || uScaleData[1] === 0xCA) {
          // Weight notification
          let newWeight: number = ((uScaleData[2] << 8) + uScaleData[3]) / 10;

          /** We've got the issue that the Uint doesn't pass us negative values, but if we used signed, when the scale shows
           * 23 grams, the weight is -23 grams, therefore we cant make a good compromise.
           * After the scale will go up to 3200 kilos, we check the weight and if its above, we take the signed int.
           */
          if (newWeight > 3200) {
            newWeight = ((scaleData[2] << 8) + scaleData[3]) / 10;
          }
          const weightIsStable = (uScaleData[1] === 0xCE);
          this.setWeight(newWeight, weightIsStable);

        } else if (uScaleData[1] === 0xAA && uScaleData[2] === 0x01) {
          // Tare button pressed.
          this.tareEvent.emit();
          await this.tare();
        } else if (uScaleData[1] === 0xAA && uScaleData[2] === 0x02) {
          // Timer button pressed
          this.timerEvent.emit(null);
        }


      }, (_data) => {

      }
    );
  }

  private async deattachNotification() {
    ble.stopNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      (e) => {

      },
      (e) => {

      });
  }
}
