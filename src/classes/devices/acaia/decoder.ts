import { MAGIC1, MAGIC2 } from './constants';
import {
  Button,
  Message,
  MessageType,
  ParsedMessage,
  ScaleMessageType,
  Settings,
  Units,
  DecoderResult,
  DecoderResultType,
  CommandType,
} from './common';
import { EventType } from './acaia';

type Logger = (...args: unknown[]) => any;

const bytesPerCommand = {
  [CommandType.EVENT_SA]: 255,
  [CommandType.STATUS_A]: 255,
};

const bytesPerCommandPearl = {
  [CommandType.EVENT_SA]: 255,
  [CommandType.STATUS_A]: 16,
};

export class Decoder {
  private readonly log: Logger;
  private packet: ArrayBuffer;

  constructor(log: Logger) {
    this.log = log;
  }

  public process(buffer: ArrayBuffer): DecoderResult {
    this.log('Decoder#process start');
    this.addBuffer(buffer);
    const messages = this.processMessages();
    this.log('Decoder#process, receives messages', { messages });

    if (messages.length) {
      return { type: DecoderResultType.DECODE_RESULT, data: messages };
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
    /*
    Packet Structure:

    2 bytes - header: MAGIC1, MAGIC2
    1 byte - cmd
    255 bytes - cmd data, the numbers below are packet sizes for every cmd (0 indexed)
      255  0 e_cmd_system_sa,
      255  1 e_cmd_str_sa,
      1,   2 e_cmd_battery_s,
      2,   3 e_cmd_weight_s,
      1,   4 e_cmd_tare_s,
      255  5 e_cmd_custom_sa,
      1,   6 e_cmd_status_s,
      255  7 e_cmd_info_a,
      255  8 e_cmd_status_a,
      15,  9 e_cmd_isp_s,
      3,   10 e_cmd_setting_chg_s,
      15,  11 e_cmd_identify_s,
      255  12 e_cmd_event_sa,
      2,   13 e_cmd_timer_s,
      255  14 e_cmd_file_s,
      15,  15 e_cmd_setpwd_s,
      255  16 e_cmd_pcs_weight_s,
      255  17 e_cmd_pretare_s,
        e_cmd_size;

     */

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
    if (cmd === CommandType.EVENT_SA) {
      msgType = bytes[messageStart + 4];
      payloadIn = bytes.slice(messageStart + 5, messageEnd);
      return [
        this.parseMessage(msgType, payloadIn.buffer),
        bytes.slice(messageEnd).buffer,
      ];
    }
    if (cmd === CommandType.STATUS_A) {
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

  private parseMessage(
    msgType: ScaleMessageType,
    buffer: ArrayBuffer
  ): Message {
    const payload = new Uint8Array(buffer);

    let weight: number = null;
    let button: Button = null;
    let time: number = null;

    if (msgType === ScaleMessageType.WEIGHT) {
      weight = this.decodeWeight(payload);
    } else {
      if (msgType === ScaleMessageType.ACK) {
        /*
        ACK packet structure:
        1 byte - skip/empty
        1 byte - id
        5 bits - result type
        3 bits - value
         */
        if (payload[2] === 5) {
          weight = this.decodeWeight(payload.slice(3));
        } else {
          if (payload[2] === 7) {
            time = this.decodeTime(payload.slice(3));
          }
        }
        this.log('heartbeat response (weight: ' + weight + ' time: ' + time);
      } else {
        if (msgType === ScaleMessageType.TIMER) {
          time = this.decodeTime(payload);
          this.log('timer: ' + time);
        } else {
          if (msgType === ScaleMessageType.KEY) {
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
                  this.log('stop time: ' + time + ' weight: ' + weight);
                } else {
                  if (payload[0] === 9 && payload[1] === 7) {
                    button = Button.RESET;
                    time = this.decodeTime(payload.slice(2));
                    weight = this.decodeWeight(payload.slice(6));
                    this.log('reset time: ' + time + ' weight: ' + weight);
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
    /*
    Weight event packet structure
    Endian: little endian
    -------------------------------------------------------------------
    |  Weight Value | Decimal Point | Stable | Positive | Type        |
    -------------------------------------------------------------------
    | uint 32 bits  | uint 8 bits   | 1 bit  | 1 bit    | uint 6 bits |
    | 0  1  2  3    |       4       |              5                  |
    */

    // Skipping first 2 bytes since we'll never get values bigger than 2^16
    let value = ((weight_payload[1] & 0xff) << 8) + (weight_payload[0] & 0xff);
    const unit = weight_payload[4] & 0xff;
    const stable = weight_payload[5] & 0b1;
    const positive = weight_payload[5] & (0b10 >> 1);
    const type = weight_payload[5] & (0b111100 >> 2);

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
            value /= 100.0;
          }
        }
      }
    }

    if (positive === 1) {
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
