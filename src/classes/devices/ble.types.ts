export type UUID = string;

export interface LimitedPeripheralData {
  name: string;
  id: string;
  advertising: number[];
  rssi: number;
}

export interface PeripheralData extends LimitedPeripheralData {
  services?: UUID[];
  characteristics: Characteristic[];
}

export interface Characteristic {
  service: UUID;
  chracterstic: UUID;
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
