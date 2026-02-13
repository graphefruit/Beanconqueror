import { IOSAdvertisingData } from '../ble.types';

export function to128bitUUID(uuid: string) {
  // nothing to do
  switch (uuid.length) {
    case 4:
      return `0000${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
    case 8:
      return `${uuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
    case 36:
      return uuid.toUpperCase();
    default:
      throw new Error('invalid uuid: ' + uuid);
  }
}

export function parseAdvertisingManufacturerData(
  adv: ArrayBuffer | IOSAdvertisingData,
): Uint8Array | null {
  if (
    adv &&
    'kCBAdvDataManufacturerData' in adv &&
    adv.kCBAdvDataManufacturerData instanceof ArrayBuffer
  ) {
    return new Uint8Array(adv.kCBAdvDataManufacturerData);
  }

  if (adv instanceof ArrayBuffer) {
    const view = new Uint8Array(adv);
    if (!view.length) {
      return null;
    }

    for (let i = 0; i < view.length - 1; ) {
      const packetLength = view[i++]; // first byte is length
      const packetType = view[i++]; // second byte is type
      const dataLength = packetLength - 1; // -1 for type

      if (packetType === 0xff) {
        // 0xff is manufacturer's data
        return new Uint8Array(view.slice(i, i + dataLength));
      }
      i += dataLength;
    }
  }

  return null;
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
