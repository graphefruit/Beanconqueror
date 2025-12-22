import { Injectable } from '@angular/core';
import { AndroidNativeCalls } from '../../native/android-native-calls-plugin';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor } from '@capacitor/core';
import { UISettingsStorage } from '../uiSettingsStorage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';

interface Theme {
  isDark: boolean;
  statusBarStyle: Style;
  statusBarColor: string;
  navigationBarColor: string;
  keyboardStyle: KeyboardStyle;
}

const DarkTheme: Theme = {
  isDark: true,
  statusBarStyle: Style.Dark,
  statusBarColor: '#121212',
  navigationBarColor: '#121212',
  keyboardStyle: KeyboardStyle.Dark,
};

const LightTheme: Theme = {
  isDark: false,
  statusBarStyle: Style.Light,
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
      // Status bar
      promises.push(StatusBar.setStyle({ style: theme.statusBarStyle }));
      // TODO: Remove this hack for android during Capacitor 8 migration, see issue #1003 and #1006
      if (Capacitor.getPlatform() === 'android') {
        promises.push(
          AndroidNativeCalls.setStatusBarColor({ color: theme.statusBarColor }),
        );
      } else {
        promises.push(
          StatusBar.setBackgroundColor({ color: theme.statusBarColor }),
        );
      }

      // Navigation bar
      promises.push(
        NavigationBar.setNavigationBarColor({
          color: theme.navigationBarColor,
          darkButtons: !theme.isDark,
        }),
      );

      // Keyboard
      if (isIOS) {
        promises.push(Keyboard.setStyle({ style: theme.keyboardStyle }));
      }
    }
    // Await all promises at the end only, the plugin calls can happen in parallel
    await Promise.all(promises);
  }
}
