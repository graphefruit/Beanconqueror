import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private readonly THEME_KEY = 'theme';

  constructor(private storage: Storage) {
    this.storage.create();
  }

  async getTheme(): Promise<string> {
    return await this.storage.get(this.THEME_KEY);
  }

  async setTheme(theme: string) {
    await this.storage.set(this.THEME_KEY, theme);
    this.toggleDarkPalette(theme === 'dark');
  }

  toggleDarkPalette(shouldAdd: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', shouldAdd);
  }
}
