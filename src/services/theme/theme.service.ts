import { Injectable } from '@angular/core';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { EdgeToEdge } from '@capawesome/capacitor-android-edge-to-edge-support';
import { UISettingsStorage } from '../uiSettingsStorage';

interface Theme {
  isDark: boolean;
  statusBarStyle: Style;
  systemBarsStyle: SystemBarsStyle;
  statusBarColor: string;
  navigationBarColor: string;
  keyboardStyle: KeyboardStyle;
}

const DarkTheme: Theme = {
  isDark: true,
  statusBarStyle: Style.Dark,
  systemBarsStyle: SystemBarsStyle.Dark,
  statusBarColor: '#121212',
  navigationBarColor: '#121212',
  // navigationBarColor: '#222428',
  keyboardStyle: KeyboardStyle.Dark,
};

const LightTheme: Theme = {
  isDark: false,
  statusBarStyle: Style.Light,
  systemBarsStyle: SystemBarsStyle.Light,
  statusBarColor: '#F0F0F0',
  navigationBarColor: '#F0F0F0',
  keyboardStyle: KeyboardStyle.Light,
};

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private prefersDark: MediaQueryList;

  private _darkMode = false;
  public isDarkMode() {
    return this._darkMode;
  }

  constructor(private readonly uiSettingsStorage: UISettingsStorage) {}
  public async initialize() {
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDark.addEventListener('change', () => {
      void this.adjustTheme();
    });

    await DarkMode.addAppearanceListener(() => {
      void this.adjustTheme();
    });

    await this.adjustTheme();
  }

  public async initializeBeforeAppReady() {
    await DarkMode.init();
    const { dark } = await DarkMode.isDarkMode();
    await this.applyTheme(dark ? DarkTheme : LightTheme);
  }

  public async adjustTheme() {
    const settings = this.uiSettingsStorage.getSettings();

    let isDark: boolean;
    switch (settings.theme_mode) {
      case THEME_MODE_ENUM.LIGHT:
        isDark = false;
        break;
      case THEME_MODE_ENUM.DARK:
        isDark = true;
        break;
      case THEME_MODE_ENUM.DEVICE:
        if (Capacitor.getPlatform() === 'web') {
          isDark = this.prefersDark.matches;
        } else {
          isDark = (await DarkMode.isDarkMode()).dark;
        }
        break;
    }

    await this.applyTheme(isDark ? DarkTheme : LightTheme);
  }

  public async setLightMode() {
    await this.applyTheme(LightTheme);
  }

  private async applyTheme(theme: Theme) {
    const promises = [];

    this._darkMode = theme.isDark;
    document.documentElement.classList.toggle('ion-palette-dark', theme.isDark);

    const isAndroid = Capacitor.getPlatform() === 'android';
    const isIOS = Capacitor.getPlatform() === 'ios';
    if (isAndroid || isIOS) {
      // Status bar handling must be done both by the legacy status bar plugin...
      promises.push(StatusBar.setStyle({ style: theme.statusBarStyle }));
      promises.push(
        StatusBar.setBackgroundColor({ color: theme.statusBarColor }),
      );
      // ...and the new SystemBars plugin to work on all supported API levels
      promises.push(SystemBars.setStyle({ style: theme.systemBarsStyle }));

      if (isAndroid) {
        // On Android we let the Android-specific edge-to-edge plugin handle the bar colors
        // iOS should just work natively according to documentation.
        promises.push(
          EdgeToEdge.setNavigationBarColor({ color: theme.navigationBarColor }),
        );
        promises.push(
          EdgeToEdge.setStatusBarColor({ color: theme.statusBarColor }),
        );
      }

      // Keyboard
      if (isIOS) {
        promises.push(Keyboard.setStyle({ style: theme.keyboardStyle }));
      }
    }
    // Await all promises at the end only, the plugin calls can happen in parallel
    await Promise.all(promises);
  }
}
