import type { CaffeineHealthPlugin } from '../../native/caffeine-health-plugin';
import type { HealthPort } from './health-port';
import type { PortResult } from './port-result';

const UNAVAILABLE: PortResult<never> = {
  ok: false,
  error: 'Health unavailable',
};
const OK: PortResult<void> = { ok: true, value: undefined };

/** HEALTH_PORT over CaffeineHealthPlugin.swift: the only code that calls it. */
export class CapacitorHealthAdapter implements HealthPort {
  constructor(private readonly plugin: CaffeineHealthPlugin | undefined) {}

  public async isAvailable(): Promise<boolean> {
    try {
      return (await this.plugin?.isAvailable())?.available === true;
    } catch {
      return false;
    }
  }

  public async requestCaffeineWrite(): Promise<PortResult<void>> {
    if (!this.plugin || !(await this.isAvailable())) {
      return UNAVAILABLE;
    }
    try {
      const { granted } = await this.plugin.requestAuthorization();
      return granted ? OK : { ok: false, error: 'Caffeine write denied' };
    } catch (error) {
      return { ok: false, error: messageOf(error) };
    }
  }

  public async storeCaffeine(
    grams: number,
    date: Date,
  ): Promise<PortResult<void>> {
    if (!this.plugin) {
      return UNAVAILABLE;
    }
    try {
      await this.plugin.storeCaffeine({ grams, date: date.getTime() });
      return OK;
    } catch (error) {
      return { ok: false, error: messageOf(error) };
    }
  }
}

function messageOf(error: unknown): string {
  return (
    (error as { message?: string } | undefined)?.message ?? 'Unknown error'
  );
}
