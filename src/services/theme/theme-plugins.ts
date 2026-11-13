import { InjectionToken } from '@angular/core';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor, SystemBars } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

/**
 * Native plugins the theme service talks to. Capacitor plugin proxies cannot
 * be spied on, so the service receives them through this token and unit tests
 * replace them at this boundary.
 */
export interface ThemePlugins {
  getPlatform: () => string;
  darkMode: Pick<
    typeof DarkMode,
    'init' | 'isDarkMode' | 'addAppearanceListener'
  >;
  statusBar: Pick<typeof StatusBar, 'setStyle' | 'setBackgroundColor'>;
  systemBars: Pick<typeof SystemBars, 'setStyle'>;
  edgeToEdge: Pick<
    typeof EdgeToEdge,
    'setStatusBarColor' | 'setNavigationBarColor'
  >;
  keyboard: Pick<typeof Keyboard, 'setStyle'>;
}

export const THEME_PLUGINS = new InjectionToken<ThemePlugins>('THEME_PLUGINS', {
  providedIn: 'root',
  factory: () => ({
    getPlatform: () => Capacitor.getPlatform(),
    darkMode: DarkMode,
    statusBar: StatusBar,
    systemBars: SystemBars,
    edgeToEdge: EdgeToEdge,
    keyboard: Keyboard,
  }),
});
