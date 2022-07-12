export enum CommandType {
  SYSTEM_SA,
  STR_SA,
  BATTERY_S,
  WEIGHT_S,
  TARE_S,
  CUSTOM_SA,
  STATUS_S,
  INFO_A,
  STATUS_A,
  ISP_S,
  SETTING_CHG_S,
  IDENTIFY_S,
  EVENT_SA,
  TIMER_S,
  FILE_S,
  SETPWD_S,
  PCS_WEIGHT_S,
  PRETARE_S,
  SIZE,
}

export enum ScaleMessageType {
  WEIGHT = 5,
  BATTERY = 6,
  TIMER = 7,
  KEY = 8,
  SETTINGS = 9,
  CD = 10,
  ACK = 11,
}

export enum Button {
  TARE = 'tare',
  START = 'start',
  STOP = 'stop',
  RESET = 'reset',
  UNKNOWN = 'unknown',
}

export enum Units {
  GRAMS = 'grams',
  OUNCES = 'ounces',
}

export enum MessageType {
  MESSAGE,
  SETTINGS,
}

export interface Message {
  type: MessageType.MESSAGE;
  msgType: ScaleMessageType;
  weight: number;
  time: number;
  button: Button;
}

export interface Settings {
  type: MessageType.SETTINGS;
  units: Units;
  battery: number;
  beepOn: boolean;
  autoOff: boolean;
}

export type ParsedMessage = Settings | Message;

export enum DecoderResultType {
  LOG,
  DECODE_RESULT,
  ENCODE_RESULT,
}

export interface DecoderResult {
  type: DecoderResultType.DECODE_RESULT;
  data: ParsedMessage[];
}

export interface DecoderLog {
  type: DecoderResultType.LOG;
  data: unknown[];
}

export type WorkerResult = DecoderLog | DecoderResult;

export type Platform = 'ios' | 'android' | 'web' | 'mobile';
// they are more but we don't care
