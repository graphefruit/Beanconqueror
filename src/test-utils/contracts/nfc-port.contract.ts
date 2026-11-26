import type { NfcPort, NfcTag } from '../../services/ports/nfc-port';

/** Puts an NFC_PORT implementation into each situation of the contract. */
export interface NfcPortDriver {
  readonly port: NfcPort;
  setEnabled(enabled: boolean): void;
  answerScan(answer: NfcTag | Error): void;
  failWrites(message: string): void;
  written(): readonly string[];
  present(tag: NfcTag, opensApp: boolean): void;
}

const TAG: NfcTag = {
  ndefMessage: [{ tnf: 1, type: [0x55], payload: [4, 0x61] }],
};
const LINK = 'https://beanconqueror.com/app/nfc/#3E95E1/START_BREW';

/** The behaviour every NFC_PORT shares, so the fake answers like the adapter. */
export function nfcPortContract(
  name: string,
  createDriver: () => NfcPortDriver,
): void {
  describe(`${name} as NFC_PORT`, () => {
    let driver: NfcPortDriver;

    beforeEach(() => {
      driver = createDriver();
    });

    for (const enabled of [true, false]) {
      it(`tells that NFC is ${enabled ? 'on' : 'off'}`, async () => {
        driver.setEnabled(enabled);

        expect(await driver.port.isEnabled()).toBe(enabled);
      });
    }

    it('hands over the scanned tag', async () => {
      driver.answerScan(TAG);

      expect(await driver.port.scanTag()).toEqual({ ok: true, value: TAG });
    });

    it('returns a failed scan instead of throwing', async () => {
      driver.answerScan(new Error('Session invalidated by user'));

      expect(await driver.port.scanTag()).toEqual({
        ok: false,
        error: 'Session invalidated by user',
      });
    });

    it('writes the link', async () => {
      expect(await driver.port.writeUri(LINK)).toEqual({
        ok: true,
        value: undefined,
      });
      expect(driver.written()).toEqual([LINK]);
    });

    it('returns a failed write instead of throwing', async () => {
      driver.failWrites('Tag is read only');

      expect(await driver.port.writeUri(LINK)).toEqual({
        ok: false,
        error: 'Tag is read only',
      });
      expect(driver.written()).toEqual([]);
    });

    it('hands each tag once to the first listener', () => {
      const first = jasmine.createSpy('first');
      const second = jasmine.createSpy('second');
      driver.port.listen(first);
      driver.port.listen(second);

      driver.present(TAG, false);
      driver.present(TAG, true);

      expect(first.calls.allArgs()).toEqual([
        [{ tag: TAG, opensApp: false }],
        [{ tag: TAG, opensApp: true }],
      ]);
      expect(second).not.toHaveBeenCalled();
    });
  });
}
