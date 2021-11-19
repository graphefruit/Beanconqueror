import { Platforms } from '@ionic/core';
// Converted to TypeScript from Python from https://github.com/lucapinello/pyacaia

import { Characteristic } from '../ble.types';
import { MAGIC1, MAGIC2, LUNAR_CHARACTERISTIC_UUID, LUNAR_SERVICE_UUID, PYXIS_SERVICE_UUID, PYXIS_TX_CHARACTERISTIC_UUID, PYXIS_RX_CHARACTERISTIC_UUID } from './constants';
import { Button, ParsedMessage, MessageType, ScaleMessageType, Units, WorkerResult, DecoderResultType, DEBUG } from './common';
import { memoize } from 'lodash';
import { UILog } from '../../../services/uiLog';
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
  if (DEBUG) {
    try {
      UILog.getInstance().log(`ACAIA: ${JSON.stringify(args)}`)
    } catch (e) { }
  }
}

class Logger {
  private uiLog: UILog
  private prefix: string;

  constructor(prefix = 'ACAIA') {
    this.uiLog = UILog.getInstance();
    this.prefix = prefix;
  }

  log(...args) {
    return this.uiLog.log(`${this.prefix}: ${JSON.stringify(args)}`);
  }

  info(...args) {
    return this.uiLog.info(`${this.prefix} INFO: ${JSON.stringify(args)}`);
  }

  error(...args) {
    return this.uiLog.error(`${this.prefix} ERROR: ${JSON.stringify(args)}`);
  }

  debug(...args) {
    if (DEBUG) {
      return this.uiLog.log(`${this.prefix} DEBUG: ${JSON.stringify(args)}`);
    }
  }
}

// DecodeWorkers receives array buffer from heartbeat notification and emits parsed messages if any
class DecoderWorker {
  private worker: Worker;
  private readonly decodeCallback: (msgs: ParsedMessage[]) => any;
  private loading: Promise<unknown>;
  private logger: Logger


  constructor(callback: (msgs: ParsedMessage[]) => any) {
    this.decodeCallback = callback;
    this.logger = new Logger('ACAIA DecodeWorker container');

    if (typeof Worker !== 'undefined') {
      this.logger.log('Workers are supported. Creating a decode worker...')
      this.worker = new Worker(new URL('./decode.worker', import.meta.url));
      this.worker.onmessage = this.handleMessage.bind(this);
    } else {
      this.logger.log('Workers are NOT supported. Import decoder...');
      // fallback to running in setTimeout
      // dynamically imoprt './decoder' to prevent webpack including the code when we have Workers
      this.loading = import('./decoder')
        .then(({ Decoder }) => {
          this.logger.debug('Decoder is imported, initalizing...')
          const l = new Logger('ACAIA DecodeWorker');
          const decoder = new Decoder(l.debug.bind(l));
          // @ts-ignore
          this.worker = {
            postMessage: (message) => {
              // pretend that we are doing it in parallel
              setTimeout(() => {
                const result = decoder.process(message);
                if (result) {
                  setTimeout(() => {
                    this.handleMessage({ data: result });
                  });
                }
              });
            },
          };
        })
        .catch(this.logger.error.bind(this.logger));
    }
  }

  public addBuffer(buffer: ArrayBuffer) {
    if (this.worker) {
      this.worker.postMessage(buffer, [buffer]);
    } else {
      this.loading.then(() => this.addBuffer(buffer));
    }
  }

  private handleMessage({ data }) {
    this.logger.debug("Decoder sent a message", data)
    if (data instanceof Object && data.hasOwnProperty('type') && data.hasOwnProperty('data')) {
      switch ((data as WorkerResult).type) {
        case DecoderResultType.LOG:
          this.logger.debug(...data.data);
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
  private tx_char_uuid: string;
  private rx_char_uuid: string;
  private weight_uuid: string;

  // TODO(mike1808) Pyxis is not supported right now
  private isPyxisStyle: boolean;
  private readonly characteristics: Characteristic[];

  private platforms: Platforms[];

  private worker: DecoderWorker;

  private logger: Logger;

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

  constructor(device_id: string, platforms: Platforms[], characteristics: Characteristic[]) {
    /*For Pyxis-style devices, the UUIDs can be overridden.  char_uuid
                      is the command UUID, and weight_uuid is where the notify comes
                      from.  Old-style scales only specify char_uuid
                    */
    this.device_id = device_id;
    this.platforms = platforms;
    this.connected = false;

    this.logger = new Logger();

    // TODO(mike1808): make it to work with new Lunar and Pyxis by auto-detecting service and char uuid
    this.logger.info("received charactersitics: ", JSON.stringify(characteristics))
    this.characteristics = characteristics;
    this.isPyxisStyle = false;

    if (!this.findBLEUUIDs()) {
      throw new Error("Cannot find weight service and characterstics on the scale");
    } else {
      this.logger.info("discovered following services and characterstics",
        { service: this.weight_uuid, tx: this.tx_char_uuid, rx: this.rx_char_uuid, pyxis: this.isPyxisStyle })
    }

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
    this.logger.log('Connect scale');
    if (this.connected) {
      this.logger.log('Already connected, bail.')
      return;
    }

    this.callback = callback;

    if (!this.platforms.includes('ios')) {
      try {
        await promisify(ble.requestMtu)(this.device_id, 247);
      } catch (e) {
        this.logger.error('failed to set MTU' + JSON.stringify(e));
      }
    }

    this.worker = new DecoderWorker(this.messageParseCallback.bind(this));
    this.logger.log("Subscribing to notificatoins", { device_id: this.device_id, weight_uuid: this.weight_uuid, char_uuid: this.rx_char_uuid });
    ble.startNotification(this.device_id, this.weight_uuid, this.rx_char_uuid, this.handleNotification.bind(this), (err) => {
      this.logger.error("failed to subscribe to notifications " + JSON.stringify(err));
      this.disconnect()
        .catch(this.logger.error.bind(this.logger))
    });

    await this.write(new Uint8Array([0, 1]).buffer);
    this.notificationsReady();
  }

  public async disconnect() {
    this.connected = false;
    await promisify(ble.stopNotification)((this.device_id, this.weight_uuid, this.tx_char_uuid));
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

  private findBLEUUIDs() {
    for (let char of this.characteristics) {
      if (to128bitUUID(char.service) === to128bitUUID(LUNAR_SERVICE_UUID) &&
        to128bitUUID(char.characteristic) === to128bitUUID(LUNAR_CHARACTERISTIC_UUID)) {
        this.tx_char_uuid = char.characteristic;
        this.rx_char_uuid = char.characteristic;
        this.weight_uuid = char.service;
        return true;
      } else if (to128bitUUID(char.service) === to128bitUUID(PYXIS_SERVICE_UUID)) {
        this.isPyxisStyle = true;
        this.weight_uuid = char.service;
        if (to128bitUUID(char.characteristic) === to128bitUUID(PYXIS_TX_CHARACTERISTIC_UUID)) {
          this.tx_char_uuid = char.characteristic
        } else if (to128bitUUID(char.characteristic) === to128bitUUID(PYXIS_RX_CHARACTERISTIC_UUID)) {
          this.rx_char_uuid = char.characteristic
        }
      }
    }
    return false;
  }

  private handleNotification(value: ArrayBuffer) {
    this.worker.addBuffer(value);
    this.heartbeat();
  }

  private messageParseCallback(messages: ParsedMessage[]) {
    messages.forEach((msg) => {
      this.logger.debug('Message recieved - ' + JSON.stringify(msg));
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
          this.logger.debug('weight: ' + msg.weight + ' ' + Date.now());
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
    this.logger.info('Scale Ready!');
    this.connected = true;
  }

  private write(data: ArrayBuffer, withoutResponse = false) {
    this.logger.debug("trying to write: ", new Uint8Array(data))
    return new Promise((resolve) => {
      ble[withoutResponse ? 'writeWithoutResponse' : 'write'](this.device_id, this.weight_uuid, this.tx_char_uuid, data,
        resolve, (err) => {
          this.logger.error("failed to write to characteristic, but we are ignoring it", err, withoutResponse);
          resolve(false) // resolve for both cases because sometimes write says it's an error but in reality it's fine
        }
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
            .catch(this.logger.error.bind(this.logger));
        }

        if (Date.now() >= this.last_heartbeat + 1000) {
          this.logger.debug('Sending heartbeat...');
          this.last_heartbeat = Date.now();
          if (this.isPyxisStyle) {
            this.write(encodeId(this.isPyxisStyle));
          }
          this.write(encodeHeartbeat(), false);
          this.logger.debug('Heartbeat success');
        }
        return true;
      } catch (e) {
        this.logger.error('Heartbeat failed ' + JSON.stringify(e));
        console.error('Heartbeat failed ' + e);
        try {
          await this.disconnect();
        } catch (e) {
          this.logger.error(e)
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
  log("encodeNotificationRequest");
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
  log("encodeId");
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
  log("encodeHeartbeat");
  const payload = [2, 0];
  return encode(0, payload);
});

const encodeTare = memoize((): ArrayBuffer => {
  log("encodeTare");
  const payload = [0];
  return encode(4, payload);
});

const encodeGetSettings = memoize((): ArrayBuffer => {
  log("encodeSettings");
  /* Settings are returned as a notification */
  const payload = new Array(16).fill(0);
  return encode(6, payload);
});

const encodeStartTimer = memoize((): ArrayBuffer => {
  log("encodeStartTimer");
  const payload = [0, 0];
  return encode(13, payload);
});

const encodeStopTimer = memoize((): ArrayBuffer => {
  log("encodeStopTimer");
  const payload = [0, 2];
  return encode(13, payload);
});

const encodeResetTimer = memoize((): ArrayBuffer => {
  log("encodeResetTimer");
  const payload = [0, 1];
  return encode(13, payload);
});

function encode(msgType: number, payload: number[]): ArrayBuffer {
  log("encode", { msgType, payload });
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
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, resolve, reject);
    });
  };
}


function to128bitUUID(uuid: string) {
  // nothing to do
  switch (uuid.length) {
    case 4:
      return `0000${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
    case 8:
      return `${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`
    case 36:
      return uuid.toUpperCase()
    default:
      throw new Error("invalid uuid: " + uuid);
  }
}
