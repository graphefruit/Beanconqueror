import { InjectionToken } from '@angular/core';

import { Capacitor, SystemBars } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar } from '@capacitor/status-bar';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';

import {
  AndroidNativeCalls,
  BCAndroidNativeCalls,
} from '../../native/android-native-calls-plugin';

/**
 * Native plugins and browser APIs the theme service talks to. Capacitor plugin proxies cannot
 * be spied on, so the service receives them through this token and unit tests
 * replace them at this boundary.
 */
export interface ThemePlugins {
  getPlatform: () => string;
  /** The system appearance; native web views follow it like browsers do. */
  colorScheme: Pick<MediaQueryList, 'matches' | 'addEventListener'>;
  statusBar: Pick<typeof StatusBar, 'setStyle' | 'setBackgroundColor'>;
  systemBars: Pick<typeof SystemBars, 'setStyle'>;
  edgeToEdge: Pick<
    typeof EdgeToEdge,
    'setStatusBarColor' | 'setNavigationBarColor'
  >;
  androidNativeCalls: Pick<BCAndroidNativeCalls, 'setBackgroundColor'>;
  keyboard: Pick<typeof Keyboard, 'setStyle'>;
}

export const THEME_PLUGINS = new InjectionToken<ThemePlugins>('THEME_PLUGINS', {
  providedIn: 'root',
  factory: () => ({
    getPlatform: () => Capacitor.getPlatform(),
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)'),
    statusBar: StatusBar,
    systemBars: SystemBars,
    edgeToEdge: EdgeToEdge,
    androidNativeCalls: AndroidNativeCalls,
    keyboard: Keyboard,
  }),
});
