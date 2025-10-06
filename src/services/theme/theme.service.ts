import { Injectable } from '@angular/core';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';

import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor } from '@capacitor/core';
import { UISettingsStorage } from '../uiSettingsStorage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { NavigationBar } from '@capgo/capacitor-navigation-bar';
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
      if (shouldAdd) {
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: '#121212' });
        NavigationBar.setNavigationBarColor({
          color: '#121212',
          darkButtons: false,
        });
      } else {
        StatusBar.setStyle({ style: Style.Light });
        StatusBar.setBackgroundColor({ color: '#F0F0F0' });
        NavigationBar.setNavigationBarColor({
          color: '#F0F0F0',
          darkButtons: true,
        });
      }
    }
    this._darkMode = shouldAdd;
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }
}
