// Converted to TypeScript from Python from https://github.com/lucapinello/pyacaia

import {Characteristic} from '../ble.types';
import {MAGIC1, MAGIC2, SCALE_CHARACTERISTIC_UUID, SCALE_SERVICE_UUID} from './constants';
import {Button, ParsedMessage, MessageType, ScaleMessageType, Units, WorkerResult, DecoderResultType, DEBUG} from './common';
import {memoize} from 'lodash';
import {UILog} from '../../../services/uiLog';
declare var ble;

export enum EventType {
  WEIGHT,
  TIMER_START,
  TIMER_STOP,
  TIMER_RESET,
  TARE,
  SETTINGS,
}

const log = (...args) => {

  try {
    const uiLogInstance = UILog.getInstance();

    // tslint:disable
    uiLogInstance.log('ACAIA - ' + JSON.stringify(args));
  }
  catch(ex) {

  }
  console.log(...args);

};

// DecodeWorkers receives array buffer from heartbeat notification and emits parsed messages if any
class DecoderWorker {
  private worker: Worker;
  private readonly decodeCallback: (msgs: ParsedMessage[]) => any;
  private loading: Promise<unknown>;

  constructor(callback: (msgs: ParsedMessage[]) => any) {
    this.decodeCallback = callback;
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('./decode.worker', import.meta.url));
      this.worker.onmessage = this.handleMessage.bind(this);
    } else {
      // fallback to running in setTimeout
      // dynamically imoprt './decoder' to prevent webpack including the code when we have Workers
      this.loading = import('./decoder')
        .then(({Decoder}) => {
          const decoder = new Decoder(log);
          // @ts-ignore
          this.worker = {
            postMessage: (message) => {
              // pretend that we are doing it in parallel
              setTimeout(() => {
                const result = decoder.process(message);
                if (result) {
                  setTimeout(() => {
                    this.handleMessage({data: result});
                  });
                }
              });
            },
          };
        })
        .catch(console.error.bind(console));
    }
  }

  public addBuffer(buffer: ArrayBuffer) {
    if (this.worker) {
      this.worker.postMessage(buffer, [buffer]);
    } else {
      this.loading.then(() => this.addBuffer(buffer));
    }
  }

  private handleMessage({data}) {
    if (data instanceof Object && data.hasOwnProperty('type') && data.hasOwnProperty('data')) {
      switch ((data as WorkerResult).type) {
        case DecoderResultType.LOG:
          log(...data.data);
          break;
        case DecoderResultType.DECODE_RESULT:
          this.decodeCallback(data.data);
          break;
      }
    }
  }
}

export class AcaiaScale {
  private readonly device_id: string;
  private char_uuid: string;
  private weight_uuid: string;

  // TODO(mike1808) Pyxis is not supported right now
  private isPyxisStyle: boolean;
  private readonly characteristics: Characteristic[];

  private worker: DecoderWorker;

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
    this.callback = callback;
    try {
      await promisify(ble.requestMtu)(this.device_id, 247);
    } catch (e) {
      console.error('failed to set MTU', e);
    }

    this.worker = new DecoderWorker(this.messageParseCallback.bind(this));
    ble.startNotification(this.device_id, this.weight_uuid, this.char_uuid, this.handleNotification.bind(this));
    await this.write(new Uint8Array([0, 1]).buffer);
    this.notificationsReady();
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

  private handleNotification(value: ArrayBuffer) {
    this.worker.addBuffer(value);
    this.heartbeat();
  }

  private messageParseCallback(messages: ParsedMessage[]) {
    messages.forEach((msg) => {
      if (msg.type === MessageType.SETTINGS) {
        this.battery = msg.battery;
        this.units = msg.units;
        this.auto_off = msg.autoOff;
        this.beep_on = msg.beepOn;
        this.callback(EventType.SETTINGS);
      } else if (msg.type === MessageType.MESSAGE) {
        if (msg.msgType === ScaleMessageType.WEIGHT) {
          this.weight = msg.weight;
          this.callback(EventType.WEIGHT, this.weight);
          log('weight: ' + msg.weight + ' ' + Date.now());
        } else {
          if (msg.msgType === ScaleMessageType.TIMER) {
            this.timer_start_time = Date.now() - msg.time;
            this.timer_running = true;
            this.callback(EventType.TIMER_START, this.timer_start_time);
          } else {
            if (msg.msgType === ScaleMessageType.TARE_START_STOP_RESET) {
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
    });
  }

  private notificationsReady() {
    this.ident();
    this.last_heartbeat = Date.now();
    log('Scale Ready!');
    this.connected = true;
  }

  private write(data: ArrayBuffer, withoutResponse = false) {
    return new Promise((resolve) => {
      ble[withoutResponse ? 'writeWithoutResponse' : 'write'](this.device_id, this.weight_uuid, this.char_uuid, data,
        resolve, resolve  // resolve for both cases because sometimes write says it's an error but in reality it's fine
      );
    });
  }

  private ident() {
    return Promise.all(
      [
        this.write(encodeId(this.isPyxisStyle), true),
        this.write(encodeNotificationRequest(), true),
      ]
    );
  }

  private heartbeat() {
    if (!this.connected) {
      return false;
    }
    setTimeout(async () => {
      try {
        while (this.command_queue.length) {
          const packet = this.command_queue.shift();
          this.write(packet, true)
            .catch(log);
        }
        if (Date.now() >= this.last_heartbeat + 1000) {
          this.last_heartbeat = Date.now();
          if (this.isPyxisStyle) {
            this.write(encodeId(this.isPyxisStyle));
          }
          this.write(encodeHeartbeat(), false);
          log('Heartbeat success');
        }
        return true;
      } catch (e) {
        console.error('Heartbeat failed ' + e);
        try {
          await this.disconnect();
        } catch (e) {
          return false;
        }
      }
    }, 0);
  }
}

const encodeEventData = memoize((payload: number[]): ArrayBuffer => {
  const bytes = new Array(payload.length + 1);
  bytes[0] = payload.length + 1;
  for (let i = 0, _pj_a = payload.length; i < _pj_a; i += 1) {
    bytes[i + 1] = payload[i] & 0xff;
  }
  return encode(12, bytes);
});

const encodeNotificationRequest = memoize((): ArrayBuffer => {
  const payload = [
    0,  // weight
    1,  // weight argument
    1,  // battery
    2,  // battery argument
    2,  // timer
    5,  // timer argument (number heartbeats between timer messages)
    3,  // key
    4   // setting
  ];
  return encodeEventData(payload);
});

const encodeId = memoize((isPyxisStyle = false): ArrayBuffer => {
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
});

const encodeHeartbeat = memoize((): ArrayBuffer => {
  const payload = [2, 0];
  return encode(0, payload);
});

const encodeTare = memoize((): ArrayBuffer => {
  const payload = [0];
  return encode(4, payload);
});

const encodeGetSettings = memoize((): ArrayBuffer => {
  /* Settings are returned as a notification */
  const payload = new Array(16).fill(0);
  return encode(6, payload);
});

const encodeStartTimer = memoize((): ArrayBuffer => {
  const payload = [0, 0];
  return encode(13, payload);
});

const encodeStopTimer = memoize((): ArrayBuffer => {
  const payload = [0, 2];
  return encode(13, payload);
});

const encodeResetTimer = memoize((): ArrayBuffer => {
  const payload = [0, 1];
  return encode(13, payload);
});

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

function promisify(fn) {
  // tslint:disable-next-line:only-arrow-functions
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, resolve, reject);
    });
  };
}
