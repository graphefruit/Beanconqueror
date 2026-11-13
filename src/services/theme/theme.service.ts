import { inject, Injectable } from '@angular/core';

import { SystemBarsStyle } from '@capacitor/core';
import { KeyboardStyle } from '@capacitor/keyboard';
import { Style } from '@capacitor/status-bar';

import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';
import { UISettingsStorage } from '../uiSettingsStorage';
import { THEME_PLUGINS } from './theme-plugins';

interface Theme {
  isDark: boolean;
  statusBarStyle: Style;
  systemBarsStyle: SystemBarsStyle;
  /** Token holding the bar colour of this mode, defined on :root in bq-tokens.scss. */
  systemBarColorToken: string;
  keyboardStyle: KeyboardStyle;
}

// Style.Dark / SystemBarsStyle.Dark mean light icons for a dark bar.
const DarkTheme: Theme = {
  isDark: true,
  statusBarStyle: Style.Dark,
  systemBarsStyle: SystemBarsStyle.Dark,
  systemBarColorToken: '--bq-system-bar-dark',
  keyboardStyle: KeyboardStyle.Dark,
};

const LightTheme: Theme = {
  isDark: false,
  statusBarStyle: Style.Light,
  systemBarsStyle: SystemBarsStyle.Light,
  systemBarColorToken: '--bq-system-bar-light',
  keyboardStyle: KeyboardStyle.Light,
};

// The native plugins only accept #rrggbb.
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly plugins = inject(THEME_PLUGINS);

  private prefersDark: MediaQueryList;

  private _darkMode = false;
  public isDarkMode() {
    return this._darkMode;
  }
  public async initialize() {
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDark.addEventListener('change', () => {
      void this.adjustTheme();
    });

    await this.plugins.darkMode.addAppearanceListener(() => {
      void this.adjustTheme();
    });

    await this.adjustTheme();
  }

  public async initializeBeforeAppReady() {
    await this.plugins.darkMode.init();
    const { dark } = await this.plugins.darkMode.isDarkMode();
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
        if (this.plugins.getPlatform() === 'web') {
          isDark = this.prefersDark.matches;
        } else {
          isDark = (await this.plugins.darkMode.isDarkMode()).dark;
        }
        break;
    }

    await this.applyTheme(isDark ? DarkTheme : LightTheme);
  }

  public async setLightMode() {
    await this.applyTheme(LightTheme);
  }

  /**
   * Reads the bar colour from the design tokens so status bar, navigation bar
   * and theme-color follow the page colour. Returns undefined when the
   * stylesheet is missing or the token is no plain hex value; the bars then
   * keep their current colour instead of receiving an invalid one.
   */
  private getSystemBarColor(theme: Theme): string | undefined {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(theme.systemBarColorToken)
      .trim();
    return HEX_COLOR.test(value) ? value : undefined;
  }

  /**
   * The static theme-color tags in index.html follow the system scheme; once
   * the app setting is known, every tag gets the colour of the applied mode.
   */
  private setThemeColorMeta(color: string) {
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        meta.content = color;
      });
  }

  private async applyTheme(theme: Theme) {
    const promises = [];

    this._darkMode = theme.isDark;
    document.documentElement.classList.toggle('ion-palette-dark', theme.isDark);

    const barColor = this.getSystemBarColor(theme);
    if (barColor) {
      this.setThemeColorMeta(barColor);
    }

    const isAndroid = this.plugins.getPlatform() === 'android';
    const isIOS = this.plugins.getPlatform() === 'ios';
    if (isAndroid || isIOS) {
      // Status bar handling must be done both by the legacy status bar plugin...
      promises.push(
        this.plugins.statusBar.setStyle({ style: theme.statusBarStyle }),
      );
      if (barColor) {
        promises.push(
          this.plugins.statusBar.setBackgroundColor({ color: barColor }),
        );
      }
      // ...and the new SystemBars plugin to work on all supported API levels
      promises.push(
        this.plugins.systemBars.setStyle({ style: theme.systemBarsStyle }),
      );

      if (isAndroid && barColor) {
        // On Android we let the Android-specific edge-to-edge plugin handle the bar colors
        // iOS should just work natively according to documentation.
        promises.push(
          this.plugins.edgeToEdge.setNavigationBarColor({ color: barColor }),
        );
        promises.push(
          this.plugins.edgeToEdge.setStatusBarColor({ color: barColor }),
        );
      }

      // Keyboard
      if (isIOS) {
        promises.push(
          this.plugins.keyboard.setStyle({ style: theme.keyboardStyle }),
        );
      }
    }
    // Await all promises at the end only, the plugin calls can happen in parallel
    await Promise.all(promises);
  }
}
