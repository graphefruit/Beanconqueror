import type { HealthPort } from '../../services/ports/health-port';

/** Puts a HEALTH_PORT implementation into each situation of the contract. */
export interface HealthPortDriver {
  readonly port: HealthPort;
  setAvailable(available: boolean): void;
  setGrants(grants: boolean): void;
  failStores(message: string): void;
  stored(): readonly { grams: number; date: Date }[];
}

const TAKEN = new Date('2026-11-28T08:30:00Z');

/** The behaviour every HEALTH_PORT shares, so the fake answers like the adapter. */
export function healthPortContract(
  name: string,
  createDriver: () => HealthPortDriver,
): void {
  describe(`${name} as HEALTH_PORT`, () => {
    let driver: HealthPortDriver;

    beforeEach(() => {
      driver = createDriver();
    });

    for (const available of [true, false]) {
      it(`tells that Health is ${available ? '' : 'not '}available`, async () => {
        driver.setAvailable(available);

        expect(await driver.port.isAvailable()).toBe(available);
      });
    }

    it('reports granted write access', async () => {
      expect(await driver.port.requestCaffeineWrite()).toEqual({
        ok: true,
        value: undefined,
      });
    });

    it('returns a declined request instead of throwing', async () => {
      driver.setGrants(false);

      expect(await driver.port.requestCaffeineWrite()).toEqual({
        ok: false,
        error: 'Caffeine write denied',
      });
    });

    it('does not ask without Health', async () => {
      driver.setAvailable(false);

      expect(await driver.port.requestCaffeineWrite()).toEqual({
        ok: false,
        error: 'Health unavailable',
      });
    });

    it('stores the grams unchanged at the given time', async () => {
      expect(await driver.port.storeCaffeine(0.144, TAKEN)).toEqual({
        ok: true,
        value: undefined,
      });
      expect(driver.stored()).toEqual([{ grams: 0.144, date: TAKEN }]);
    });

    it('returns a failed store instead of throwing', async () => {
      driver.failStores('Not authorized');

      expect(await driver.port.storeCaffeine(0.144, TAKEN)).toEqual({
        ok: false,
        error: 'Not authorized',
      });
      expect(driver.stored()).toEqual([]);
    });
  });
}
