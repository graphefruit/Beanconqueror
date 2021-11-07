// Converted to TypeScript from Python from https://github.com/lucapinello/pyacaia

import {Characteristic} from '../ble.types';
import {MAGIC1, MAGIC2, SCALE_CHARACTERISTIC_UUID, SCALE_SERVICE_UUID} from './constants';

declare var ble;

export enum EventType {
  WEIGHT,
  TIMER_START,
  TIMER_STOP,
  TIMER_RESET,
  TARE,
  SETTINGS,
}

export class AcaiaScale {
  private readonly device_id: string;
  private char_uuid: string;
  private weight_uuid: string;
  private isPyxisStyle: boolean;
  private readonly characteristics: Characteristic[];

  private connected: boolean;
  private packet: Uint8Array;
  private last_heartbeat: number;

  private timer_start_time: number;
  private paused_time: number;
  private readonly transit_delay: number;
  private weight: number;
  private battery: number;
  private units: Units;
  private auto_off: boolean;
  private beep_on: boolean;
  private timer_running: boolean;

  private command_queue: ArrayBuffer[];
  private queue: Queue<Uint8Array>;
  private set_interval_thread: ReturnType<typeof setInterval>;
  private callback: (eventType: EventType, data?: any) => any;

  constructor(device_id: string, characteristics: Characteristic[]) {
    /*For Pyxis-style devices, the UUIDs can be overridden.  char_uuid
                      is the command UUID, and weight_uuid is where the notify comes
                      from.  Old-style scales only specify char_uuid
                    */
    this.device_id = device_id;
    this.connected = false;

    // TODO(mike1808): make it to work with new Lunar and Pyxis by auto-detecting service and char uuid
    this.characteristics = characteristics;
    this.char_uuid = SCALE_CHARACTERISTIC_UUID;
    this.weight_uuid = SCALE_SERVICE_UUID;
    this.isPyxisStyle = false;

    this.queue = null;
    this.command_queue = [];
    this.packet = null;
    this.set_interval_thread = null;
    this.last_heartbeat = 0;
    this.timer_start_time = 0;
    this.paused_time = 0;
    this.transit_delay = 200;
    this.weight = null;
    this.battery = null;
    this.units = null;
    this.auto_off = null;
    this.beep_on = null;
    this.timer_running = false;
  }

  public getElapsedTime(): number {
    /* Return the time displayed on the timer, in seconds */
    if (this.timer_running) {
      return Date.now() - this.timer_start_time + this.transit_delay;
    } else {
      return this.paused_time;
    }
  }

  public async connect(callback) {
    if (this.connected) {
      return;
    }
    this.queue = new Queue(this.callbackQueue.bind(this));
    this.callback = callback;
    try {
      await promisify(ble.requestMtu)(this.device_id, 247);

    } catch (e) {
    }
    ble.startNotification(this.device_id, this.weight_uuid, this.char_uuid, this.handleNotification.bind(this));
    this.write(new Uint8Array([0, 1]).buffer);
    this.notificationsReady();
    // time.sleep(0.5);
  }

  public async disconnect() {
    this.connected = false;
    await ble.stopNotification(this.device_id, this.weight_uuid, this.char_uuid);
  }

  public tare() {
    if (!this.connected) {
      return false;
    }

    this.command_queue.push(encodeTare());
    return true;
  }

  public startTimer() {
    if (!this.connected) {
      return false;
    }
    this.command_queue.push(encodeStartTimer());
    this.timer_start_time = Date.now();
    this.timer_running = true;
    return true;
  }

  public stopTimer() {
    if (!this.connected) {
      return false;
    }
    this.command_queue.push(encodeStopTimer());
    this.paused_time = Date.now() - this.timer_start_time;
    this.timer_running = false;
    return true;
  }

  public resetTimer() {
    if (!this.connected) {
      return false;
    }
    this.command_queue.push(encodeResetTimer());
    this.paused_time = 0;
    this.timer_running = false;
  }

  private addBuffer(buffer2) {
    let packet_len;
    packet_len = 0;
    if (this.packet) {
      packet_len = this.packet.length;
    }
    const result = new Uint8Array(packet_len + buffer2.length);
    for (let i = 0, _pj_a = packet_len; i < _pj_a; i += 1) {
      result[i] = this.packet[i];
    }
    for (let i = 0, _pj_a = buffer2.length; i < _pj_a; i += 1) {
      result[i + packet_len] = buffer2[i];
    }
    this.packet = result;
  }

  private handleNotification(value: ArrayBuffer) {
    this.heartbeat();
    this.queue.add(new Uint8Array(value));
  }

  private callbackQueue(payload: Uint8Array) {
    let msg;
    this.addBuffer(payload);
    while (true) {
      [msg, this.packet] = decode(this.packet);
      if (!msg) {
        return;
      }
      if (msg instanceof Settings) {
        this.battery = msg.battery;
        this.units = msg.units;
        this.auto_off = msg.auto_off;
        this.beep_on = msg.beep_on;
        this.callback(EventType.SETTINGS);
      } else if (msg instanceof Message) {
        if (msg.msgType === MessageType.WEIGHT) {
          this.weight = msg.value;
          this.callback(EventType.WEIGHT, this.weight);
          console.log('weight: ' + msg.value.toString() + ' ' + Date.now());
        } else {
          if (msg.msgType === MessageType.TIMER) {
            this.timer_start_time = Date.now() - msg.time;
            this.timer_running = true;
            this.callback(EventType.TIMER_START, this.timer_start_time);
          } else {
            if (msg.msgType === MessageType.TARE_START_STOP_RESET) {
              switch (msg.button) {
                case Button.TARE:
                  this.weight = 0;
                  this.callback(EventType.TARE, 0);
                  break;
                case Button.START:
                  this.timer_start_time =
                    Date.now() - this.paused_time + this.transit_delay;
                  this.timer_running = true;
                  this.callback(EventType.TIMER_START, this.timer_start_time);
                  break;
                case Button.STOP:
                  this.paused_time = msg.time;
                  this.timer_running = false;
                  this.callback(EventType.TIMER_STOP, this.paused_time);
                  break;
                case Button.RESET:
                  this.paused_time = 0;
                  this.timer_running = false;
                  this.callback(EventType.TIMER_RESET, 0);
                  break;
              }
            }
          }
        }
      }
    }
  }

  private notificationsReady() {
    this.ident();
    this.last_heartbeat = Date.now();
    console.info('Scale Ready!');
    this.connected = true;
  }

  private write(data: ArrayBuffer, withoutResponse = false) {
    ble[withoutResponse ? 'writeWithoutResponse' : 'write'](this.device_id, this.weight_uuid, this.char_uuid, data);
  }

  private ident() {
    this.write(encodeId(this.isPyxisStyle), true);
    this.write(encodeNotificationRequest(), true);
  }

  private heartbeat() {
    if (!this.connected) {
      return false;
    }
    setTimeout(() => {
      try {
        while (this.command_queue.length) {
          const packet = this.command_queue.shift();
          if (packet) {
            this.write(packet, false);
          } else {
            break;
          }
        }
        if (Date.now() >= this.last_heartbeat + 1000) {
          this.last_heartbeat = Date.now();
          if (this.isPyxisStyle) {
            this.write(encodeId(this.isPyxisStyle));
          }
          this.write(encodeHeartbeat(), false);
          console.log('Heartbeat success');
        }
        return true;
      } catch (e) {
        console.log('Heartbeat failed ' + e.toString());
        try {
          this.disconnect();
        } catch (e) {
          return false;
        }
      }
    }, 10);
  }
}

class Queue<T> {
  private readonly queue: T[];
  private readonly callback: (val: T) => any;

  private running: boolean;

  constructor(callback: (val: T) => any) {
    this.queue = [];
    this.callback = callback;
    this.running = false;
  }

  public add(data: T) {
    this.queue.push(data);
    if (!this.running) {
      this.dequeue();
    }
  }

  public dequeue() {
    setTimeout(() => {
      this.running = true;
      let val = this.queue.shift();
      while (val) {
        this.callback(val);
        if (this.queue.length) {
          val = this.queue.shift();
        } else {
          val = null;
        }
      }

      this.running = false;
    }, 10);
  }

  public next() {
    return this.dequeue();
  }
}

enum MessageType {
  WEIGHT = 5,
  HEARTBEAT = 11,
  TIMER = 7,
  TARE_START_STOP_RESET = 8,
}

enum Button {
  TARE = 'tare',
  START = 'start',
  STOP = 'stop',
  RESET = 'reset',
  UNKNOWN = 'unknown',
}

class Message {
  private readonly payload: Uint8Array;

  public value: number;
  public button: Button;
  public time: number;
  public readonly msgType: MessageType;

  constructor(msgType: MessageType, payload: Uint8Array) {
    this.msgType = msgType;
    this.payload = payload;
    this.value = null;
    this.button = null;
    this.time = null;

    if (this.msgType === MessageType.WEIGHT) {
      this.value = this.decode_weight(payload);
    } else {
      if (this.msgType === MessageType.HEARTBEAT) {
        if (payload[2] === 5) {
          this.value = this.decode_weight(payload.slice(3));
        } else {
          if (payload[2] === 7) {
            this.time = this.decode_time(payload.slice(3));
          }
        }
        console.log(
          'heartbeat response (weight: ' +
          this.value.toString() +
          ' time: ' +
          this.time.toString()
        );
      } else {
        if (this.msgType === MessageType.TIMER) {
          this.time = this.decode_time(payload);
          console.log('timer: ' + this.time.toString());
        } else {
          if (this.msgType === MessageType.TARE_START_STOP_RESET) {
            if (payload[0] === 0 && payload[1] === 5) {
              this.button = Button.TARE;
              this.value = this.decode_weight(payload.slice(2));
              console.log('tare (weight: ' + this.value.toString() + ')');
            } else {
              if (payload[0] === 8 && payload[1] === 5) {
                this.button = Button.START;
                this.value = this.decode_weight(payload.slice(2));
                console.log('start (weight: ' + this.value.toString() + ')');
              } else {
                if (payload[0] === 10 && payload[1] === 7) {
                  this.button = Button.STOP;
                  this.time = this.decode_time(payload.slice(2));
                  this.value = this.decode_weight(payload.slice(6));
                  console.log(
                    'stop time: ' +
                    this.time.toString() +
                    ' weight: ' +
                    this.value.toString()
                  );
                } else {
                  if (payload[0] === 9 && payload[1] === 7) {
                    this.button = Button.RESET;
                    this.time = this.decode_time(payload.slice(2));
                    this.value = this.decode_weight(payload.slice(6));
                    console.log(
                      'reset time: ' +
                      this.time.toString() +
                      ' weight: ' +
                      this.value.toString()
                    );
                  } else {
                    this.button = Button.UNKNOWN;
                    console.log('unknownbutton ' + payload.toString());
                  }
                }
              }
            }
          } else {
            console.log('message ' + msgType.toString() + ': ' + payload);
          }
        }
      }
    }
  }

  private decode_weight(weight_payload: Uint8Array): number {
    let value;
    value = ((weight_payload[1] & 0xff) << 8) + (weight_payload[0] & 255);
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
            throw new Error(`unit value not in range ${unit}`);
          }
        }
      }
    }
    if ((weight_payload[5] & 2) === 2) {
      value *= -1;
    }
    return value;
  }

  private decode_time(time_payload: Uint8Array): number {
    let value;
    value = (time_payload[0] & 0xff) * 60;
    value = value + time_payload[1];
    value = value + time_payload[2] / 10.0;
    return value * 1000;
  }
}

enum Units {
  GRAMS = 'grams',
  OUNCES = 'ounces',
}

class Settings {
  public battery: number;
  public units: Units;
  public auto_off: boolean;
  public beep_on: boolean;

  constructor(payload) {
    this.battery = payload[1] & 127;
    if (payload[2] === 2) {
      this.units = Units.GRAMS;
    } else {
      if (payload[2] === 5) {
        this.units = Units.OUNCES;
      } else {
        this.units = null;
      }
    }

    this.auto_off = !!(payload[4] * 5);
    this.beep_on = payload[6] === 1;
    console.log(
      'settings: battery=' +
      this.battery.toString() +
      ' ' +
      this.units.toString() +
      ' auto_off=' +
      this.auto_off.toString() +
      ' beep=' +
      this.beep_on.toString()
    );
    console.log(
      'unknown settings: ' +
      [
        payload[0],
        payload[1] & 128,
        payload[3],
        payload[5],
        payload[7],
        payload[8],
        payload[9],
      ].toString()
    );
  }
}

function encode(msgType: number, payload: number[]): ArrayBuffer {
  let cksum1, cksum2, val;
  const bytes = new Uint8Array(5 + payload.length);
  bytes[0] = MAGIC1;
  bytes[1] = MAGIC2;
  bytes[2] = msgType;
  cksum1 = 0;
  cksum2 = 0;
  for (let i = 0, _pj_a = payload.length; i < _pj_a; i += 1) {
    val = payload[i] & 0xff;
    bytes[3 + i] = val;
    if (i % 2 === 0) {
      cksum1 += val;
    } else {
      cksum2 += val;
    }
  }
  bytes[payload.length + 3] = cksum1 & 0xff;
  bytes[payload.length + 4] = cksum2 & 0xff;
  return bytes.buffer;
}

function decode(bytes: Uint8Array): [Message | Settings, Uint8Array] {
  /*Return a tuple - first element is the message, or None
                        if one not yet found.  Second is are the remaining
                        bytes, which can be empty
                        Messages are encoded as the encode() function above,
                        min message length is 6 bytes
                        MAGIC1 (0xef)
                        MAGIC2 (0xdd)
                        command
                        length  (including this byte, excluding checksum)
                        payload of length-1 bytes
                        checksum byte1
                        checksum byte2

                        */
  let messageStart, msgType, payloadIn;
  messageStart = -1;
  for (let i = 0, _pj_a = bytes.length - 1; i < _pj_a; i += 1) {
    if (bytes[i] === MAGIC1 && bytes[i + 1] === MAGIC2) {
      messageStart = i;
      break;
    }
  }
  if (messageStart < 0 || bytes.length - messageStart < 6) {
    return [null, bytes];
  }
  const messageEnd = messageStart + bytes[messageStart + 3] + 5;
  if (messageEnd > bytes.length) {
    return [null, bytes];
  }
  if (messageStart > 0) {
    console.log('Ignoring ' + messageStart + ' bytes before header');
  }
  const cmd = bytes[messageStart + 2];
  if (cmd === 12) {
    msgType = bytes[messageStart + 4];
    payloadIn = bytes.slice(messageStart + 5, messageEnd);
    return [new Message(msgType, payloadIn), bytes.slice(messageEnd)];
  }
  if (cmd === 8) {
    return [
      new Settings(bytes.slice(messageStart + 3)),
      bytes.slice(messageEnd),
    ];
  }
  console.log(
    'Non event notification message command ' +
    cmd.toString() +
    ' ' +
    bytes.slice(messageStart, messageEnd).toString()
  );
  return [null, bytes.slice(messageEnd)];
}

function encodeEventData(payload: number[]): ArrayBuffer {
  const bytes = new Array(payload.length + 1);
  bytes[0] = payload.length + 1;
  for (let i = 0, _pj_a = payload.length; i < _pj_a; i += 1) {
    bytes[i + 1] = payload[i] & 0xff;
  }
  return encode(12, bytes);
}

function encodeNotificationRequest(): ArrayBuffer {
  const payload = [
    0,  // weight
    1,  // weight argument
    1,  // battery
    2,  // battery argument
    2,  // timer
    5,  // timer argument (number heartbeats between timer messages)
    3,  // key
    4  // setting
  ];
  return encodeEventData(payload);
}

function encodeId(isPyxisStyle = false): ArrayBuffer {
  let payload: number[];
  if (isPyxisStyle) {
    payload = [
      0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, 0x31, 0x32, 0x33, 0x34
    ];
  } else {
    payload = [
      0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d, 0x2d
    ];
  }
  return encode(11, payload);
}

function encodeHeartbeat(): ArrayBuffer {
  const payload = [2, 0];
  return encode(0, payload);
}

function encodeTare(): ArrayBuffer {
  const payload = [0];
  return encode(4, payload);
}

function encodeGetSettings(): ArrayBuffer {
  /* Settings are returned as a notification */
  const payload = new Array(16).fill(0);
  return encode(6, payload);
}

function encodeStartTimer(): ArrayBuffer {
  const payload = [0, 0];
  return encode(13, payload);
}

function encodeStopTimer(): ArrayBuffer {
  const payload = [0, 2];
  return encode(13, payload);
}

function encodeResetTimer(): ArrayBuffer {
  const payload = [0, 1];
  return encode(13, payload);
}

function promisify(fn) {
  // tslint:disable-next-line:only-arrow-functions
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, resolve, reject);
    });
  };
}
