import { InjectionToken } from '@angular/core';

import { Capacitor } from '@capacitor/core';

import { CaffeineHealth } from '../../native/caffeine-health-plugin';
import { CapacitorHealthAdapter } from './capacitor-health-adapter';
import type { PortResult } from './port-result';

/** The app's only way to Apple Health; failures arrive as results. */
export interface HealthPort {
  /** Whether this device has Health data (iOS only). */
  isAvailable(): Promise<boolean>;
  /** Asks for write access to caffeine; fails when Health is missing or the user declined. */
  requestCaffeineWrite(): Promise<PortResult<void>>;
  /** Stores `grams` of caffeine taken at `date`. */
  storeCaffeine(grams: number, date: Date): Promise<PortResult<void>>;
}

export const HEALTH_PORT = new InjectionToken<HealthPort>('HEALTH_PORT', {
  providedIn: 'root',
  factory: () =>
    new CapacitorHealthAdapter(
      // Only the iOS app has the plugin; elsewhere a call would fail with "not implemented".
      Capacitor.getPlatform() === 'ios' ? CaffeineHealth : undefined,
    ),
});
