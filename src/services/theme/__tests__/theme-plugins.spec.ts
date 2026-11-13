import { TestBed } from '@angular/core/testing';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor, SystemBars } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

import { THEME_PLUGINS, ThemePlugins } from '../theme-plugins';

// The ThemeService tests replace the token; these check what the app gets.
describe('THEME_PLUGINS', () => {
  it('hands each Capacitor plugin to its own slot', () => {
    const plugins = TestBed.inject(THEME_PLUGINS);
    const expected: Omit<ThemePlugins, 'getPlatform'> = {
      darkMode: DarkMode,
      statusBar: StatusBar,
      systemBars: SystemBars,
      edgeToEdge: EdgeToEdge,
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

  it('reads the platform from Capacitor', () => {
    spyOn(Capacitor, 'getPlatform').and.returnValue('ios');

    expect(TestBed.inject(THEME_PLUGINS).getPlatform()).toBe('ios');
  });
});
