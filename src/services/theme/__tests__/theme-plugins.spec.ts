import { TestBed } from '@angular/core/testing';

import { Capacitor, SystemBars } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

import { AndroidNativeCalls } from '../../../native/android-native-calls-plugin';
import { THEME_PLUGINS, ThemePlugins } from '../theme-plugins';

// The ThemeService tests replace the token; these check what the app gets.
describe('THEME_PLUGINS', () => {
  it('hands each Capacitor plugin to its own slot', () => {
    const plugins = TestBed.inject(THEME_PLUGINS);
    const expected: Omit<ThemePlugins, 'getPlatform' | 'colorScheme'> = {
      statusBar: StatusBar,
      systemBars: SystemBars,
      edgeToEdge: EdgeToEdge,
      androidNativeCalls: AndroidNativeCalls,
      keyboard: Keyboard,
    };

    // Plugin proxies answer every property, so Jasmine cannot print them
    // (toBe does even when it passes); compare the references only.
    for (const slot of Object.keys(expected) as (keyof typeof expected)[]) {
      expect(plugins[slot] === expected[slot])
        .withContext(slot)
        .toBeTrue();
    }
  });

  it('watches the system appearance through the dark colour-scheme query', () => {
    const plugins = TestBed.inject(THEME_PLUGINS);

    expect((plugins.colorScheme as MediaQueryList).media).toBe(
      '(prefers-color-scheme: dark)',
    );
    expect(plugins.colorScheme.matches).toBe(
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
  });

  it('reads the platform from Capacitor', () => {
    const getPlatform = spyOn(Capacitor, 'getPlatform');
    const plugins = TestBed.inject(THEME_PLUGINS);

    // Two platforms, so a fixed return value cannot pass.
    for (const platform of ['android', 'ios']) {
      getPlatform.and.returnValue(platform);
      expect(plugins.getPlatform()).withContext(platform).toBe(platform);
    }
  });
});
