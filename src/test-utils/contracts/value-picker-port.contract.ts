import type { PortResult } from '../../services/ports/port-result';
import type {
  DatePick,
  ValuePickerPort,
} from '../../services/ports/value-picker-port';

/** Puts a VALUE_PICKER_PORT implementation into each situation of the contract. */
export interface ValuePickerPortDriver {
  readonly port: ValuePickerPort;
  /** How the person (or the device) answers the next pick. */
  answer(answer: PortResult<DatePick>): void;
  /** The date the last pick opened on. */
  lastStart(): Date | undefined;
}

const START = new Date('2026-11-28T10:00:00.000Z');
const CHOSEN = new Date('2026-11-20T00:00:00.000Z');

/** The behaviour every VALUE_PICKER_PORT shares, so the fake answers like the adapter. */
export function valuePickerPortContract(
  name: string,
  createDriver: () => ValuePickerPortDriver,
): void {
  describe(`${name} as VALUE_PICKER_PORT`, () => {
    let driver: ValuePickerPortDriver;

    beforeEach(() => {
      driver = createDriver();
    });

    it('opens the picker on the given date', async () => {
      await driver.port.pickDate(START);

      expect(driver.lastStart()).toEqual(START);
    });

    for (const value of [
      { kind: 'chosen', date: CHOSEN },
      { kind: 'cleared' },
      { kind: 'cancelled' },
    ] as const) {
      it(`hands over a ${value.kind} date`, async () => {
        driver.answer({ ok: true, value });

        expect(await driver.port.pickDate(START)).toEqual({ ok: true, value });
      });
    }

    it('returns a failure instead of throwing', async () => {
      driver.answer({ ok: false, error: 'Activity destroyed' });

      expect(await driver.port.pickDate(START)).toEqual({
        ok: false,
        error: 'Activity destroyed',
      });
    });
  });
}
