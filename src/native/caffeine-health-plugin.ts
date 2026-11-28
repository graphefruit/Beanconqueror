import { registerPlugin } from '@capacitor/core';

/** CaffeineHealthPlugin.swift: writes caffeine to Apple Health, nothing else. */
export interface CaffeineHealthPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  /** Asks for write access to caffeine; `granted` once the user allowed it. */
  requestAuthorization(): Promise<{ granted: boolean }>;
  /** Stores `grams` of caffeine at `date` (milliseconds since 1970). */
  storeCaffeine(options: { grams: number; date: number }): Promise<void>;
}

export const CaffeineHealth =
  registerPlugin<CaffeineHealthPlugin>('CaffeineHealth');
