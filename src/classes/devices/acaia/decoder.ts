import {MAGIC1, MAGIC2} from './constants';
import {
  Button,
  Message,
  MessageType,
  ParsedMessage,
  ScaleMessageType,
  Settings,
  Units,
  DecoderResult,
  DecoderResultType
} from './common';

type Logger = (...args: unknown[]) => any;

export class Decoder {
  private readonly log: Logger;
  private packet: ArrayBuffer;

  constructor(log: Logger) {
    this.log = log;
  }

  public process(buffer: ArrayBuffer): DecoderResult {
    this.log("Decoder#process start");
    this.addBuffer(buffer);
    const messages = this.processMessages();
    this.log("Decoder#process, receives messages", { messages });

    if (messages.length) {
      return {type: DecoderResultType.DECODE_RESULT, data: messages};
    }

    return null;
  }

  private processMessages() {
    const msgs: ParsedMessage[] = [];

    while (true) {
      let msg;
      [msg, this.packet] = this.decode(this.packet);
      if (!msg) {
        break;
      } else {
        msgs.push(msg);
      }
    }

    return msgs;
  }

  private addBuffer(buffer: ArrayBuffer) {
    if (this.packet) {
      const tmp = new Uint8Array(this.packet.byteLength + buffer.byteLength);
      tmp.set(new Uint8Array(this.packet), 0);
      tmp.set(new Uint8Array(buffer), this.packet.byteLength);
      this.packet = tmp.buffer;
    } else {
      this.packet = buffer;
    }
  }

  private decode(buffer: ArrayBuffer): [ParsedMessage, ArrayBuffer] {
    const bytes = new Uint8Array(buffer);

    let messageStart, msgType, payloadIn;
    messageStart = -1;

    for (let i = 0, _pj_a = bytes.length - 1; i < _pj_a; i += 1) {
      if (bytes[i] === MAGIC1 && bytes[i + 1] === MAGIC2) {
        messageStart = i;
        break;
      }
    }
    if (messageStart < 0 || bytes.length - messageStart < 6) {
      return [null, bytes.buffer];
    }
    const messageEnd = messageStart + bytes[messageStart + 3] + 5;
    if (messageEnd > bytes.length) {
      return [null, bytes.buffer];
    }
    if (messageStart > 0) {
      this.log('Ignoring ' + messageStart + ' bytes before header');
    }
    const cmd = bytes[messageStart + 2];
    if (cmd === 12) {
      msgType = bytes[messageStart + 4];
      payloadIn = bytes.slice(messageStart + 5, messageEnd);
      return [this.parseMessage(msgType, payloadIn.buffer), bytes.slice(messageEnd).buffer];
    }
    if (cmd === 8) {
      return [
        this.parseSettings(bytes.slice(messageStart + 3).buffer),
        bytes.slice(messageEnd),
      ];
    }

    this.log(
      'Non event notification message command ' +
      cmd +
      ' ' +
      bytes.slice(messageStart, messageEnd)
    );
    return [null, bytes.slice(messageEnd).buffer];
  }

  private parseMessage(msgType: ScaleMessageType, buffer: ArrayBuffer): Message {
    const payload = new Uint8Array(buffer);

    let weight: number = null;
    let button: Button = null;
    let time: number = null;

    if (msgType === ScaleMessageType.WEIGHT) {
      weight = this.decodeWeight(payload);
    } else {
      if (msgType === ScaleMessageType.HEARTBEAT) {
        if (payload[2] === 5) {
          weight = this.decodeWeight(payload.slice(3));
        } else {
          if (payload[2] === 7) {
            time = this.decodeTime(payload.slice(3));
          }
        }
        this.log(
          'heartbeat response (weight: ' +
          weight +
          ' time: ' +
          time
        );
      } else {
        if (msgType === ScaleMessageType.TIMER) {
          time = this.decodeTime(payload);
          this.log('timer: ' + time);
        } else {
          if (msgType === ScaleMessageType.TARE_START_STOP_RESET) {
            if (payload[0] === 0 && payload[1] === 5) {
              button = Button.TARE;
              weight = this.decodeWeight(payload.slice(2));
              this.log('tare (weight: ' + weight + ')');
            } else {
              if (payload[0] === 8 && payload[1] === 5) {
                button = Button.START;
                weight = this.decodeWeight(payload.slice(2));
                this.log('start (weight: ' + weight + ')');
              } else {
                if (payload[0] === 10 && payload[1] === 7) {
                  button = Button.STOP;
                  time = this.decodeTime(payload.slice(2));
                  weight = this.decodeWeight(payload.slice(6));
                  this.log(
                    'stop time: ' +
                    time +
                    ' weight: ' +
                    weight
                  );
                } else {
                  if (payload[0] === 9 && payload[1] === 7) {
                    button = Button.RESET;
                    time = this.decodeTime(payload.slice(2));
                    weight = this.decodeWeight(payload.slice(6));
                    this.log(
                      'reset time: ' +
                      time +
                      ' weight: ' +
                      weight
                    );
                  } else {
                    button = Button.UNKNOWN;
                    this.log('unknownbutton ' + payload);
                  }
                }
              }
            }
          } else {
            this.log('message ' + msgType + ': ' + payload);
          }
        }
      }
    }

    return {
      type: MessageType.MESSAGE,
      msgType,
      weight,
      button,
      time,
    };
  }

  private decodeWeight(weight_payload: Uint8Array): number {
    let value = ((weight_payload[1] & 0xff) << 8) + (weight_payload[0] & 255);
    const unit = weight_payload[4] & 0xff;
    if (unit === 1) {
      value /= 10.0;
    } else {
      if (unit === 2) {
        value /= 100.0;
      } else {
        if (unit === 3) {
          value /= 1000.0;
        } else {
          if (unit === 4) {
            value /= 10000.0;
          } else {
            try
            {

            for (const v of weight_payload) {
              console.log("0x" + v.toString(16));
            }
           // console.log(weight_payload.map((v) => `0x${ ("" + v).toString(16)}`));
            console.error(`unit value not in range ${unit}`);
            //throw new Error(`unit value not in range ${unit}`);
            }
            catch(ex){

            }
          }
        }
      }
    }
    if ((weight_payload[5] & 2) === 2) {
      value *= -1;
    }
    return value;
  }

  private decodeTime(time_payload: Uint8Array): number {
    let value = (time_payload[0] & 0xff) * 60;
    value = value + time_payload[1];
    value = value + time_payload[2] / 10.0;
    return value * 1000;
  }

  private parseSettings(buffer: ArrayBuffer): Settings {
    const payload = new Uint8Array(buffer);

    let units: Units;
    const battery = payload[1] & 127;

    if (payload[2] === 2) {
      units = Units.GRAMS;
    } else {
      if (payload[2] === 5) {
        units = Units.OUNCES;
      } else {
        units = null;
      }
    }

    const autoOff = !!(payload[4] * 5);
    const beepOn = payload[6] === 1;
    this.log(
      'settings: battery=' +
      battery +
      ' ' +
      units +
      ' auto_off=' +
      autoOff +
      ' beep=' +
      beepOn
    );

    this.log(
      'unknown settings: ' +
      [
        payload[0],
        payload[1] & 128,
        payload[3],
        payload[5],
        payload[7],
        payload[8],
        payload[9],
      ]
    );

    return {
      type: MessageType.SETTINGS,
      battery,
      units,
      autoOff,
      beepOn,
    };
  }
}
