import { TestBed } from '@angular/core/testing';

import { FakeHealthPort } from '../../test-utils/fake-health-port';
import { HEALTH_PORT } from '../ports/health-port';
import { UIHealthKit } from '../uiHealthKit';
import { UILog } from '../uiLog';

describe('UIHealthKit', () => {
  let health: FakeHealthPort;
  let error: jasmine.Spy;
  let healthKit: UIHealthKit;

  beforeEach(() => {
    health = new FakeHealthPort();
    error = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      providers: [
        { provide: HEALTH_PORT, useValue: health },
        { provide: UILog, useValue: { error } },
      ],
    });
    healthKit = TestBed.inject(UIHealthKit);
  });

  /** Storing runs after the call returns, as the brew is saved meanwhile. */
  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve));
  }

  it('resolves availability only with Health', async () => {
    await expectAsync(healthKit.isAvailable()).toBeResolved();

    health.available = false;
    await expectAsync(healthKit.isAvailable()).toBeRejected();
  });

  it('resolves the authorization once writing is allowed', async () => {
    await expectAsync(healthKit.requestAuthorization()).toBeResolved();
    expect(error).not.toHaveBeenCalled();
  });

  for (const [situation, prepare] of [
    ['declined', (port: FakeHealthPort) => (port.grants = false)],
    ['missing', (port: FakeHealthPort) => (port.available = false)],
  ] as const) {
    it(`rejects and logs the authorization when Health is ${situation}`, async () => {
      prepare(health);

      await expectAsync(healthKit.requestAuthorization()).toBeRejected();
      expect(error).toHaveBeenCalledTimes(1);
    });
  }

  it('stores the caffeine of a brew in grams, unchanged', async () => {
    const date = new Date('2026-11-28T08:30:00Z');

    healthKit.trackCaffeineConsumption(18 * 0.008, date);
    await settle();

    expect(health.stored).toEqual([{ grams: 18 * 0.008, date }]);
    expect(error).not.toHaveBeenCalled();
  });

  it('only logs a failed store', async () => {
    health.storeError = 'Not authorized';

    expect(() =>
      healthKit.trackCaffeineConsumption(0.144, new Date()),
    ).not.toThrow();
    await settle();

    expect(error).toHaveBeenCalledOnceWith(
      'Health caffeine not stored: Not authorized',
    );
  });
});
