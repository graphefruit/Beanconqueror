import { Injectable } from '@angular/core';
import { THEME_ENUM } from '../enums/settings/theme';
import { UISettingsStorage } from './uiSettingsStorage';

@Injectable({
  providedIn: 'root',
})
export class UIThemeService {
  constructor(private readonly uiSettingsStorage: UISettingsStorage) {}

  /**
   * Applies the current theme based on settings
   * This method checks the user's theme preference and applies the appropriate theme
   */
  public async applyTheme(): Promise<void> {
    try {
      // Get the current settings to check theme preference
      const settings = await this.uiSettingsStorage.getSettings();

      // Determine which theme to apply
      let themeToApply: THEME_ENUM;

      if (settings.theme === THEME_ENUM.SYSTEM) {
        // Check system preference for dark mode
        themeToApply = this.isSystemDarkMode()
          ? THEME_ENUM.DARK
          : THEME_ENUM.LIGHT;
      } else {
        themeToApply = settings.theme;
      }

      // Apply the theme
      this.setTheme(themeToApply);
    } catch (error) {
      console.error('Error applying theme:', error);
      // Default to light theme if there's an error
      this.setTheme(THEME_ENUM.LIGHT);
    }
  }

  /**
   * Changes the theme and saves it to settings
   * @param theme - The theme to apply
   */
  public async changeTheme(theme: THEME_ENUM): Promise<void> {
    try {
      // Apply the theme immediately
      this.setTheme(theme);

      // Save the theme preference to settings
      const settings = await this.uiSettingsStorage.getSettings();
      settings.theme = theme;
      await this.uiSettingsStorage.saveSettings(settings);
    } catch (error) {
      console.error('Error changing theme:', error);
      throw error;
    }
  }

  /**
   * Sets the theme by adding/removing the dark-theme class
   * @param theme - The theme to set
   */
  private setTheme(theme: THEME_ENUM): void {
    const body = document.body;

    if (theme === THEME_ENUM.DARK) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  }

  /**
   * Checks if the system prefers dark mode
   * @returns true if system prefers dark mode
   */
  private isSystemDarkMode(): boolean {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  /**
   * Sets up a listener for system theme changes
   * This allows the app to automatically switch themes when the user changes their system preference
   */
  public setupSystemThemeListener(): void {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      mediaQuery.addEventListener('change', async (e) => {
        // Only apply system theme if the user has selected "system" theme
        const settings = await this.uiSettingsStorage.getSettings();
        if (settings.theme === THEME_ENUM.SYSTEM) {
          const newTheme = e.matches ? THEME_ENUM.DARK : THEME_ENUM.LIGHT;
          this.setTheme(newTheme);
        }
      });
    }
  }

  /**
   * Gets the current theme
   * @returns The current theme enum value
   */
  public getCurrentTheme(): THEME_ENUM {
    if (document.body.classList.contains('dark-theme')) {
      return THEME_ENUM.DARK;
    }
    return THEME_ENUM.LIGHT;
  }
}
