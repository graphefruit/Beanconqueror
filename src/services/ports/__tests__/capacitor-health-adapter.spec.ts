import { TestBed } from '@angular/core/testing';

import type { CaffeineHealthPlugin } from '../../../native/caffeine-health-plugin';
import { healthPortContract } from '../../../test-utils/contracts/health-port.contract';
import { CapacitorHealthAdapter } from '../capacitor-health-adapter';
import { HEALTH_PORT } from '../health-port';

/** CaffeineHealthPlugin.swift as the bridge hands it over, answering like a device. */
class PluginStub implements CaffeineHealthPlugin {
  public available = true;
  public grants = true;
  public authorizationError: unknown;
  public storeError: unknown;
  public readonly stored: { grams: number; date: number }[] = [];

  public isAvailable() {
    return Promise.resolve({ available: this.available });
  }

  public requestAuthorization() {
    return this.authorizationError === undefined
      ? Promise.resolve({ granted: this.grants })
      : // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        Promise.reject(this.authorizationError);
  }

  public storeCaffeine(options: { grams: number; date: number }) {
    if (this.storeError !== undefined) {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject(this.storeError);
    }
    this.stored.push(options);
    return Promise.resolve();
  }
}

healthPortContract('CapacitorHealthAdapter', () => {
  const plugin = new PluginStub();
  return {
    port: new CapacitorHealthAdapter(plugin),
    setAvailable: (available) => (plugin.available = available),
    setGrants: (grants) => (plugin.grants = grants),
    failStores: (message) => (plugin.storeError = new Error(message)),
    stored: () =>
      plugin.stored.map(({ grams, date }) => ({ grams, date: new Date(date) })),
  };
});

describe('CapacitorHealthAdapter', () => {
  let plugin: PluginStub;
  let adapter: CapacitorHealthAdapter;

  beforeEach(() => {
    plugin = new PluginStub();
    adapter = new CapacitorHealthAdapter(plugin);
  });

  it('hands the date to the plugin as milliseconds', async () => {
    await adapter.storeCaffeine(0.144, new Date(1_700_000_000_000));

    expect(plugin.stored).toEqual([{ grams: 0.144, date: 1_700_000_000_000 }]);
  });

  it('passes on a failed authorization', async () => {
    plugin.authorizationError = new Error('Missing usage description');

    expect(await adapter.requestCaffeineWrite()).toEqual({
      ok: false,
      error: 'Missing usage description',
    });
  });

  it('treats a failing availability check as not available', async () => {
    spyOn(plugin, 'isAvailable').and.rejectWith(new Error('not implemented'));

    expect(await adapter.isAvailable()).toBeFalse();
    expect(await adapter.requestCaffeineWrite()).toEqual({
      ok: false,
      error: 'Health unavailable',
    });
  });

  it('falls back to a generic message when the plugin gives none', async () => {
    plugin.storeError = {};

    expect(await adapter.storeCaffeine(0.1, new Date())).toEqual({
      ok: false,
      error: 'Unknown error',
    });
  });

  it('works without the plugin, as in the browser and on Android', async () => {
    const browser = new CapacitorHealthAdapter(undefined);

    expect(await browser.isAvailable()).toBeFalse();
    expect(await browser.requestCaffeineWrite()).toEqual({
      ok: false,
      error: 'Health unavailable',
    });
    expect(await browser.storeCaffeine(0.1, new Date())).toEqual({
      ok: false,
      error: 'Health unavailable',
    });
  });

  it('is HEALTH_PORT without the plugin outside the iOS app', async () => {
    expect(await TestBed.inject(HEALTH_PORT).isAvailable()).toBeFalse();
  });
});
