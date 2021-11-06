export const enum MessageType {
  NONE = 0,
  STR = 1,
  BATTERY = 2,
  BATTERY_RESPONSE = 3,
  WEIGHT = 4,
  WEIGHT_RESPONSE = 5,
  WEIGHT_RESPONSE2 = 6,
  TARE = 7,
  SOUND = 8,
  SOUND_ON = 9,
  LIGHT_ON = 10,
  FILE = 11,
  CUSTOM = 12,
  SIZE = 13,
}

export const SCALE_SERVICE_UUID = '00001820-0000-1000-8000-00805f9b34fb';
export const SCALE_CHARACTERISTIC_UUID = '00002a80-0000-1000-8000-00805f9b34fb';

export const MAGIC1 = 0xEF;
export const MAGIC2 = 0xDD;
