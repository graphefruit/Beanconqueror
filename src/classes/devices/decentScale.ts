import {BluetoothDevice} from './bluetoothDevice';
import {EventEmitter} from '@angular/core';

export enum DECENT_SCALE_TIMER_COMMAND {
  STOP = 'STOP',
  RESET = 'RESET',
  START= 'START'
}
declare var ble;
export default class DecentScale extends BluetoothDevice {
  public static WRITE_SERVICE_UUID = 'fff0';
  public static WRITE_CHAR_UUID = '36f5';

  public static READ_SERVICE_UUID = 'fff0';
  public static READ_CHAR_UUID = 'fff4';

  public static NOTIFY_CHAR_UUID = 'fff4';


  public static HEADER = 0x03;

  private tareCounter: number = 0;

  protected weight = {
    ACTUAL_WEIGHT: 0,
    SMOOTHED_WEIGHT: 0,
    OLD_SMOOTHED_WEIGHT: 0,
    OLD_WEIGHT: 0,
  };

  public weightChange: EventEmitter<any> = new EventEmitter();
  public flowChange: EventEmitter<any> = new EventEmitter();

  public timerEvent: EventEmitter<any> = new EventEmitter();
  public tareEvent: EventEmitter<any> = new EventEmitter();

  public static notification_callback(event, scale) {

  }


  constructor(device_id) {
    super();
    this.device_id = device_id;
    this.batteryLevel = 0;
    this.buffer = new Uint8Array();
    this.connect();
  }

  private getXOR(_bytes) {
    return _bytes[0]^_bytes[1]^_bytes[2] ^_bytes[3]^_bytes[4]^_bytes[5];
  }

  public buildTareCommand()  {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] =0x0F;
    bytes[2] =0xFD;
    bytes[3] = this.tareCounter;
    bytes[4] =0x00;
    bytes[5] =0x00;
    bytes[6] = this.getXOR(bytes);

    this.tareCounter++;
    if (this.tareCounter > 255) {
      this.tareCounter = 0;
    }

    return bytes;
  }

  public buildLedOnOffCommand(_weightLedOn: boolean, _timerLedOn: boolean) {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] =0x0A;

    if (_weightLedOn) {
      bytes[2] =0x01;
    } else {
      bytes[2] =0x00;
    }


    if (_timerLedOn) {
      bytes[3] =0x01;
    } else {
      bytes[3] =0x00;
    }
    bytes[4] =0x00;
    bytes[5] =0x00;
    bytes[6] = this.getXOR(bytes);

    return bytes;
  }
  public buildTimerCommand(_timer: DECENT_SCALE_TIMER_COMMAND =  DECENT_SCALE_TIMER_COMMAND.START) {
    const buf = new ArrayBuffer(7);
    const bytes = new Uint8Array(buf);
    bytes[0] = DecentScale.HEADER;

    bytes[1] =0x0B;

    if (_timer === DECENT_SCALE_TIMER_COMMAND.START) {
      bytes[2] =0x03;
    } else if (_timer === DECENT_SCALE_TIMER_COMMAND.RESET) {
      bytes[2] =0x02;
    } else {
      bytes[2] =0x00;
    }

    bytes[3] =0x00;
    bytes[4] =0x00;
    bytes[5] =0x00;
    bytes[6] = this.getXOR(bytes);

    return bytes;
  }


  public async connect() {
      await this.setLed(true,true);
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
    this.weight.SMOOTHED_WEIGHT = 0;
    this.weight.ACTUAL_WEIGHT = 0;
    this.weight.OLD_SMOOTHED_WEIGHT = 0;
    this.weight.OLD_WEIGHT = 0;
    this.setWeight(0);

    await this.write(this.buildTareCommand());
    await setTimeout(async () => {
      await  this.write(this.buildTareCommand());
    },50);
    await setTimeout(async () => {
      await  this.write(this.buildTareCommand());
    },75);
  }

  public async setLed(_weightOn: boolean, _timerOn: boolean) {
    await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));

    await setTimeout(async () => {
      await  this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));
    },50);
    await setTimeout(async () => {
      await  this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));
    },75);
  }


  public async setTimer(_timer: DECENT_SCALE_TIMER_COMMAND) {
    await this.write(this.buildTimerCommand(_timer));
    await setTimeout(async () => {
      await this.write(this.buildTimerCommand(_timer));
    },50);
    await setTimeout(async () => {
      await this.write(this.buildTimerCommand(_timer));
    },75);
  }

  public getWeight() {
    return this.weight;
  }
  public setWeight(_newWeight: number,_stableWeight: boolean = false) {

    // Allow negative weight
    // Each value effect the current weight bei 10%.
    // (A3 * 03 + b2 * 0.7)
    //  Actual value * 03 + smoothed value * 0.7


    this.weight.OLD_SMOOTHED_WEIGHT = this.weight.SMOOTHED_WEIGHT;
    this.weight.SMOOTHED_WEIGHT = this.calculateSmoothedWeight(_newWeight, this.weight.SMOOTHED_WEIGHT);

    // We passed every shake change, seems like everything correct, set the new weight.
    this.weight.ACTUAL_WEIGHT = _newWeight;
    this.weightChange.emit({
      ACTUAL_WEIGHT: this.weight.ACTUAL_WEIGHT,
      SMOOTHED_WEIGHT: this.weight.SMOOTHED_WEIGHT,
      STABLE: _stableWeight,
      OLD_WEIGHT: this.weight.OLD_WEIGHT,
      OLD_SMOOTHED_WEIGHT: this.weight.OLD_SMOOTHED_WEIGHT,
    });
    this.weight.OLD_WEIGHT = _newWeight;
  }
  private calculateSmoothedWeight(_actualWeight: number, _smoothedWeight: number): number {
    return (_actualWeight * 0.3) + (_smoothedWeight * 0.7);
  }

  public getSmoothedWeight() {
    return this.weight.SMOOTHED_WEIGHT;
  }
  public getOldSmoothedWeight() {
    return this.weight.OLD_SMOOTHED_WEIGHT;
  }

  public setFlow(_newWeight: number,_stableWeight: boolean = false) {
    const actualDate = new Date();
    this.flowChange.emit({
      ACTUAL_WEIGHT: this.weight.ACTUAL_WEIGHT,
      SMOOTHED_WEIGHT:this.weight.SMOOTHED_WEIGHT,
      STABLE: _stableWeight,
      DATE: actualDate
    });
  }


  public async attachNotification() {
    ble.startNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      async (_data) => {
        const scaleData = new Int8Array(_data);
        const uScaleData = new Uint8Array(_data);
        // console.log("Received: " + scaleData[1] + " - " + scaleData[2] + " - "+ scaleData[3]);
        if (uScaleData[1] === 0xCE || uScaleData[1] === 0xCA) {
          // Weight notification
          let newWeight: number =  ((uScaleData[2] << 8) + uScaleData[3]) / 10;

          /** We've got the issue that the Uint doesn't pass us negative values, but if we used signed, when the scale shows
           * 23 grams, the weight is -23 grams, therefore we cant make a good compromise.
           * After the scale will go up to 3200 kilos, we check the weight and if its above, we take the signed int.
           */
          if (newWeight > 3200) {
            newWeight = ((scaleData[2] << 8) + scaleData[3]) / 10;
          }
          const weightIsStable = (uScaleData[1] === 0xCE);
          this.setWeight(newWeight,weightIsStable);
          this.setFlow(newWeight,weightIsStable);
        } else if (uScaleData[1] === 0xAA && uScaleData[2] === 0x01) {
          // Tare button pressed.
          this.tareEvent.emit();
          await this.tare();
        } else if (uScaleData[1] === 0xAA && uScaleData[2] === 0x02) {
          // Timer button pressed
          this.timerEvent.emit();
        }



      },(_data) => {

      }
    );
  }

  public async deattachNotification() {
    ble.stopNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      (e) => {

      },
      (e) => {

      });
  }
}
