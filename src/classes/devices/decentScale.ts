import {BluetoothDevice} from './bluetoothDevice';
import {UILog} from '../../services/uiLog';
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

  public weightChange: EventEmitter<number> = new EventEmitter();

  public static notification_callback(event, scale) {

  }


  constructor(device_id) {
    super();
    this.device_id = device_id;
    this.weight = 0;
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

  public decode() {
    console.log(this.buffer);
    if (this.buffer.byteLength <= 4) {
      return;
    }


    /*if (this.buffer[0] !== DecentScale.HEADER1 && this.buffer[1] !== DecentScale.HEADER2) {
      console.log("header does not match: ", this.buffer[0], this.buffer[1]);
      this.buffer = new Uint8Array();
      return;
    }

    let cmd = this.buffer[2];
    switch (cmd) {
      // Event
      case 12:
        var msgType = this.buffer[4]
        var payload = this.buffer.slice(5)

        if (msgType === 5) {
          var value = ((payload[1] & 0xff) << 8) + (payload[0] & 0xff);
          var unit = payload[4] & 0xFF;

          if (unit === 1) {
            value /= 10;
          } else if (unit === 2) {
            value /= 100;
          } else if (unit === 3) {
            value /= 1000;
          } else if (unit === 4) {
            value /= 10000;
          }

          if ((payload[5] & 0x02) === 0x02) {
            value *= -1;
          }

          this.weight = value;
        }
        break;
      // Status
      case 8:
        //length = buffer[3];
        this.batteryLevel = this.buffer[4];
        console.log('Got status message, battery= ' + this.batteryLevel)
        break

      default:
        console.log('unknown message type: ' + cmd);
        console.log(this.buffer);
        break
    }*/
    this.buffer = new Uint8Array();
  }


  public async connect() {
 /*   console.log('Connecting to GATT Server...');
    const server = await this.device.gatt.connect();

    console.log('Getting Weight Service...');
    this.service = await server.getPrimaryService(DecentScale.SERVICE_UUID).catch(async (e) => {
      console.log('FAILED: ' + e);
      return null;
    });
    console.log('Getting Weight Characteristic...');

    setTimeout( async () => {


    this.weightCharacteristic = await this.service.getCharacteristic(DecentScale.CHAR_UUID).catch(async (e) => {
      console.log('FAILED: ' + e);
      return null;
    });
    console.log('Adding Weight Listener...');

    this.weightCharacteristic.addEventListener('characteristicvaluechanged', (e) => DecentScale.notification_callback(e, this));

    // Identify to the scale and enable notifications
    this.weightCharacteristic.startNotifications().catch(async (e) => {
      console.log('FAILED: ' + e);
      return null;
    });   },250);
*/


  /*  setTimeout( ()=> {
      console.log('Sending ident...');
      this.ident();
    }, 500);
    setTimeout( ()=> {
      console.log('Sending config...');
      this.enable_notifications();
      this.enable_notifications();
    }, 1000);*/
await this.attachNotification();
  }


    private write(_bytes: Uint8Array) {
      return new Promise((resolve, reject) => {
        ble.write(this.device_id,
          DecentScale.WRITE_SERVICE_UUID,
          DecentScale.WRITE_CHAR_UUID,
          _bytes.buffer,
          (e) => {
            resolve(undefined);
          }, (e) => {
           reject(undefined);
          });
      });
    }

  public async tare() {
    await this.write(this.buildTareCommand());
  }

  public async setLed(_weightOn: boolean, _timerOn: boolean) {
    await this.write(this.buildLedOnOffCommand(_weightOn, _timerOn));
  }


  public async setTimer(_timer: DECENT_SCALE_TIMER_COMMAND) {
    await this.write(this.buildTimerCommand(_timer));
  }

  public getWeight() {
    return this.weight;
  }
  public setWeight(_newWeight: number) {
    if (_newWeight < 0) {
      return;
    }
    if (_newWeight - this.weight > 30) {
      // If we get the interval above 30grams, we ignore this one, because it looks like "shaky"
      return;
    }



    // We passed every shake change, seems like everything correct, set the new weight.
    this.weight = _newWeight;
    this.weightChange.emit(this.weight);
  }


  public async attachNotification() {
    ble.startNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      (_data) => {
        const scaleData = new Uint8Array(_data);
        if (scaleData[1] === 0xCE || scaleData[1] === 0xCA) {
          // Weight notification
          const newWeight: number =  ((scaleData[2] << 8) + scaleData[3]) / 10;
          this.setWeight(newWeight);
        }



      },(_data) => {

      }
    );
  }

  public async deattachNotification() {
    ble.stopNotification(this.device_id, DecentScale.READ_SERVICE_UUID, DecentScale.READ_CHAR_UUID,
      (e) => {

      },
      (e) => {console.log("wrote NOT");console.log(e)});
  }
}
