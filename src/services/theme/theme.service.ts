import { Injectable } from '@angular/core';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';
import { Settings } from '../../classes/settings/settings';
import { DarkMode } from '@aparajita/capacitor-dark-mode';
import { Capacitor } from '@capacitor/core';
import { UISettingsStorage } from '../uiSettingsStorage';
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private prefersDark: MediaQueryList;

  constructor(private readonly uiSettingsStorage: UISettingsStorage) {}
  public async initialize() {
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    this.prefersDark.addEventListener('change', (mediaQuery) => {
      this.adjustTheme();
    });

    await DarkMode.init();
    const listener = await DarkMode.addAppearanceListener(({ dark }) => {
      this.adjustTheme();
    });

    this.adjustTheme();
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

  private toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }
}
