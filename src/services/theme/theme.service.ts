import { Injectable } from '@angular/core';
import { THEME_MODE_ENUM } from 'src/enums/settings/themeMode';
import { Settings } from '../../classes/settings/settings';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private prefersDark: MediaQueryList;

  constructor() {
    this.prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  }

  public initTheme(settings: Settings) {
    this.setTheme(settings);
    this.prefersDark.addEventListener('change', (mediaQuery) => {
      if (settings.theme_mode === THEME_MODE_ENUM.DEVICE) {
        this.toggleDarkPalette(mediaQuery.matches);
      }
    });
  }

  public setTheme(settings: Settings) {
    switch (settings.theme_mode) {
      case THEME_MODE_ENUM.LIGHT:
        this.toggleDarkPalette(false);
        break;
      case THEME_MODE_ENUM.DARK:
        this.toggleDarkPalette(true);
        break;
      case THEME_MODE_ENUM.DEVICE:
        this.toggleDarkPalette(this.prefersDark.matches);
        break;
    }
  }

  private toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }
}
