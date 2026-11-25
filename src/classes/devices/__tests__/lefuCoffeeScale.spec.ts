import { LefuCoffeeScale } from '../lefuCoffeeScale';
import { ScaleType } from '../types';

describe('LefuCoffeeScale', () => {
  let writes: { char: string; bytes: number[] }[];
  let scale: LefuCoffeeScale;

  const frame = (hex: string) =>
    new Uint8Array(hex.split(' ').map((_b) => parseInt(_b, 16)));

  beforeEach(() => {
    writes = [];
    (globalThis as any).ble = {
      startNotification: () => undefined,
      stopNotification: () => undefined,
      read: (
        _id: string,
        _svc: string,
        _char: string,
        success: (_data: ArrayBuffer) => void,
      ) => {
        success(new Uint8Array([89]).buffer);
      },
      write: (
        _id: string,
        _svc: string,
        char: string,
        data: ArrayBuffer,
        success: () => void,
      ) => {
        writes.push({ char, bytes: Array.from(new Uint8Array(data)) });
        success();
      },
    };
    scale = new LefuCoffeeScale(
      { id: 'CF:EA:08:29:20:E6', name: 'MSS226A' } as any,
      ScaleType.LEFU_COFFEE,
    );
  });

  afterEach(() => {
    delete (globalThis as any).ble;
  });

  it('detects MiBru MSS226A and INSMART 863A by name', () => {
    expect(LefuCoffeeScale.test({ name: 'MSS226A' })).toBeTrue();
    expect(LefuCoffeeScale.test({ name: '863A' })).toBeTrue();
    expect(LefuCoffeeScale.test({ name: 'LFSmart Scale' })).toBeFalse();
    expect(LefuCoffeeScale.test({})).toBeFalse();
  });

  it('reads battery level on connect', () => {
    expect(scale.batteryLevel).toBe(89);
  });

  it('parses weight frames (uint16 LE, 0.1 g)', () => {
    scale.parseNotification(frame('12 06 05 00 D4 01 05 00'));
    expect(scale.getWeight()).toBe(46.8);

    scale.parseNotification(frame('12 06 05 00 00 00 05 00'));
    expect(scale.getWeight()).toBe(0);
  });

  it('applies the negative flag', () => {
    scale.parseNotification(frame('12 06 15 00 CF 00 05 00'));
    expect(scale.getWeight()).toBe(-20.7);
  });

  it('ignores short or unknown frames', () => {
    scale.parseNotification(frame('12 06 05 00 D4 01 05 00'));
    scale.parseNotification(frame('12 06 05'));
    scale.parseNotification(frame('99 02 00 00'));
    expect(scale.getWeight()).toBe(46.8);
  });

  it('emits tareEvent when the scale reports a tare key event', () => {
    let tares = 0;
    scale.tareEvent.subscribe(() => tares++);
    scale.parseNotification(frame('13 02 01 01'));
    scale.parseNotification(frame('13 02 01 02'));
    expect(tares).toBe(1);
  });

  it('sends 50 00 to FFF1 on tare', async () => {
    await scale.tare();
    expect(writes).toEqual([{ char: 'fff1', bytes: [0x50, 0x00] }]);
  });
});
