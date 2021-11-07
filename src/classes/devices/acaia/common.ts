export const DEBUG = false

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

export enum WorkerResultType {
  LOG,
  DECODE_RESULT,
  ENCODE_RESULT,
}

export interface WorkerDecodeResult {
  type: WorkerResultType.DECODE_RESULT;
  data: ParsedMessage[];
}

export interface WorkerLog {
  type: WorkerResultType.LOG;
  data: unknown[];
}

export type WorkerResult = WorkerLog | WorkerDecodeResult;
