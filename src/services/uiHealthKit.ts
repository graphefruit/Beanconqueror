import { inject, Service } from '@angular/core';

import { HEALTH_PORT } from './ports/health-port';
import { UILog } from './uiLog';

@Service()
export class UIHealthKit {
  private readonly health = inject(HEALTH_PORT);
  private readonly uiLog = inject(UILog);

  /** Resolves when Apple Health can be used, rejects otherwise. */
  public async isAvailable(): Promise<void> {
    if (!(await this.health.isAvailable())) {
      throw new Error('Health unavailable');
    }
  }

  /** Resolves once writing caffeine is allowed; rejects when Health is missing or declined. */
  public async requestAuthorization(): Promise<void> {
    const result = await this.health.requestCaffeineWrite();
    if (result.ok === false) {
      this.uiLog.error(`Health authorization failed: ${result.error}`);
      throw new Error(result.error);
    }
  }

  /** Writes `_amount` grams of caffeine; a failure is only logged, the brew is saved anyway. */
  public trackCaffeineConsumption(_amount: number, _date: Date): void {
    void this.health.storeCaffeine(_amount, _date).then((result) => {
      if (result.ok === false) {
        this.uiLog.error(`Health caffeine not stored: ${result.error}`);
      }
    });
  }
}
