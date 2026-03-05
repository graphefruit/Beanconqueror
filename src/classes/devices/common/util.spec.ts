import { parseAdvertisingManufacturerData, sleep, to128bitUUID } from './util';

describe('Device util helpers', () => {
  it('to128bitUUID formats known lengths', () => {
    expect(to128bitUUID('abcd')).toBe('0000ABCD-0000-1000-8000-00805F9B34FB');
    expect(to128bitUUID('12345678')).toBe(
      '12345678-0000-1000-8000-00805F9B34FB',
    );
    expect(to128bitUUID('0000180f-0000-1000-8000-00805f9b34fb')).toBe(
      '0000180F-0000-1000-8000-00805F9B34FB',
    );
  });

  it('to128bitUUID throws on invalid length', () => {
    expect(() => to128bitUUID('abc')).toThrowError('invalid uuid: abc');
  });

  it('parseAdvertisingManufacturerData reads iOS manufacturer data', () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const adv = { kCBAdvDataManufacturerData: buffer } as any;
    const result = parseAdvertisingManufacturerData(adv);
    expect(result).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('parseAdvertisingManufacturerData parses manufacturer data from ArrayBuffer', () => {
    // Packet: length=4, type=0xff, data=0x10 0x20 0x30
    const adv = new Uint8Array([4, 0xff, 0x10, 0x20, 0x30]).buffer;
    const result = parseAdvertisingManufacturerData(adv);
    expect(result).toEqual(new Uint8Array([0x10, 0x20, 0x30]));
  });

  it('parseAdvertisingManufacturerData returns null for empty buffers', () => {
    const adv = new ArrayBuffer(0);
    expect(parseAdvertisingManufacturerData(adv)).toBeNull();
  });

  it('sleep resolves after timeout', async () => {
    jasmine.clock().install();
    const promise = sleep(5);
    jasmine.clock().tick(5);
    await promise;
    jasmine.clock().uninstall();
  });
});
