export const DEBUG = true;

export enum ScaleMessageType {
  WEIGHT = 5,
  HEARTBEAT = 11,
  TIMER = 7,
  TARE_START_STOP_RESET = 8,
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
