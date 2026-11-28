import type { HealthPort } from '../services/ports/health-port';
import type { PortResult } from '../services/ports/port-result';

/** HEALTH_PORT without a device for unit tests; set the answers, then call the code under test. */
export class FakeHealthPort implements HealthPort {
  public available = true;
  /** Whether the user allows writing caffeine in the system dialog. */
  public grants = true;
  /** When set, storing fails with this message. */
  public storeError: string | undefined;
  public requests = 0;
  public readonly stored: { grams: number; date: Date }[] = [];

  public isAvailable(): Promise<boolean> {
    return Promise.resolve(this.available);
  }

  public requestCaffeineWrite(): Promise<PortResult<void>> {
    if (!this.available) {
      return Promise.resolve({ ok: false, error: 'Health unavailable' });
    }
    this.requests++;
    return Promise.resolve(
      this.grants
        ? { ok: true, value: undefined }
        : { ok: false, error: 'Caffeine write denied' },
    );
  }

  public storeCaffeine(grams: number, date: Date): Promise<PortResult<void>> {
    if (this.storeError !== undefined) {
      return Promise.resolve({ ok: false, error: this.storeError });
    }
    this.stored.push({ grams, date });
    return Promise.resolve({ ok: true, value: undefined });
  }
}
