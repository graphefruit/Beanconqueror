export type UUID = string;

export interface IOSAdvertisingData {
  kCBAdvDataLocalName?: string;
  kCBAdvDataManufacturerData?: ArrayBuffer;
  kCBAdvDataServiceUUIDs?: string[];
  kCBAdvDataIsConnectable?: boolean;
  kCBAdvDataServiceData?: { [k: string]: ArrayBuffer };
}

export interface LimitedPeripheralData {
  name: string;
  id: string;
  advertising: ArrayBuffer | IOSAdvertisingData;
  rssi: number;
}

export interface PeripheralData extends LimitedPeripheralData {
  services?: UUID[];
  characteristics: Characteristic[];
}

export interface Characteristic {
  service: UUID;
  characteristic: UUID;
  propertis: Property[];
  descriptors?: Descriptor[];
}

export enum Property {
  READ = 'Read',
  WRITE = 'Write',
  NOTIFY = 'Notify',
}

export interface Descriptor {
  uuid: UUID;
}
