import { Injectable } from '@angular/core';
import { AndroidNativeCalls } from '../../native/android-native-calls-plugin';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor } from '@capacitor/core';
import { UISettingsStorage } from '../uiSettingsStorage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private prefersDark: MediaQueryList;

  private _darkMode: boolean = false;
  public isDarkMode() {
    return this._darkMode;
  }

  constructor(private readonly uiSettingsStorage: UISettingsStorage) {}
  public async initialize() {
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDark.addEventListener('change', (mediaQuery) => {
      this.adjustTheme();
    });

    const listener = await DarkMode.addAppearanceListener(({ dark }) => {
      this.adjustTheme();
    });

    this.adjustTheme();
  }

  public async initializeBeforeAppReady() {
    await DarkMode.init();
    const { dark } = await DarkMode.isDarkMode();
    if (dark) {
      this.toggleDarkPalette(true);
    } else {
      this.toggleDarkPalette(false);
    }
  }

  public async adjustTheme() {
    const settings = await this.uiSettingsStorage.getSettings();
    switch (settings.theme_mode) {
      case THEME_MODE_ENUM.LIGHT:
        this.toggleDarkPalette(false);
        break;
      case THEME_MODE_ENUM.DARK:
        this.toggleDarkPalette(true);
        break;
      case THEME_MODE_ENUM.DEVICE:
        if (Capacitor.getPlatform() === 'web') {
          this.toggleDarkPalette(this.prefersDark.matches);
        } else {
          const { dark } = await DarkMode.isDarkMode();
          if (dark) {
            this.toggleDarkPalette(true);
          } else {
            this.toggleDarkPalette(false);
          }
        }
        break;
    }
  }

  public async setLightMode() {
    this.toggleDarkPalette(false);
  }

  private toggleDarkPalette(shouldAdd: boolean) {
    if (Capacitor.getPlatform() !== 'web') {
      const isIOS = Capacitor.getPlatform() == 'ios';
      if (shouldAdd) {
        StatusBar.setStyle({ style: Style.Dark });

        if (Capacitor.getPlatform() === 'android') {
          AndroidNativeCalls.setStatusBarColor({ color: '#121212' });
        } else {
          StatusBar.setBackgroundColor({ color: '#121212' });
        }

        NavigationBar.setNavigationBarColor({
          color: '#121212',
          darkButtons: false,
        });
        if (isIOS) {
          Keyboard.setStyle({ style: KeyboardStyle.Dark });
        }
      } else {
        StatusBar.setStyle({ style: Style.Light });

        if (Capacitor.getPlatform() === 'android') {
          AndroidNativeCalls.setStatusBarColor({ color: '#F0F0F0' });
        } else {
          StatusBar.setBackgroundColor({ color: '#F0F0F0' });
        }

        NavigationBar.setNavigationBarColor({
          color: '#F0F0F0',
          darkButtons: true,
        });
        if (isIOS) {
          Keyboard.setStyle({ style: KeyboardStyle.Light });
        }
      }
    }
    this._darkMode = shouldAdd;
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }
}
