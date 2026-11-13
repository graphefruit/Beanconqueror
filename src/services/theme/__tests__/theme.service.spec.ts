import { TestBed } from '@angular/core/testing';

import { SystemBarsStyle } from '@capacitor/core';
import { KeyboardStyle } from '@capacitor/keyboard';
import { Style } from '@capacitor/status-bar';

import { THEME_MODE_ENUM } from '../../../enums/settings/themeMode';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { THEME_PLUGINS, ThemePlugins } from '../theme-plugins';
import { ThemeService } from '../theme.service';

// Stand-ins for the token values; the unit test checks that the service passes
// on whatever the stylesheet defines (the e2e suite checks the real colours).
const LIGHT_BAR = '#eeddcc';
const DARK_BAR = '#221100';

describe('ThemeService', () => {
  let platform: string;
  let systemDark: boolean;
  let themeMode: THEME_MODE_ENUM;
  let statusBar: jasmine.SpyObj<ThemePlugins['statusBar']>;
  let systemBars: jasmine.SpyObj<ThemePlugins['systemBars']>;
  let edgeToEdge: jasmine.SpyObj<ThemePlugins['edgeToEdge']>;
  let keyboard: jasmine.SpyObj<ThemePlugins['keyboard']>;
  let tokens: HTMLStyleElement;
  let metas: HTMLMetaElement[];
  let service: ThemeService;

  function addMeta(media: string): HTMLMetaElement {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.media = media;
    meta.content = 'initial';
    document.head.appendChild(meta);
    return meta;
  }

  beforeEach(() => {
    platform = 'android';
    systemDark = false;
    themeMode = THEME_MODE_ENUM.LIGHT;

    tokens = document.createElement('style');
    tokens.textContent = `:root { --bq-system-bar-light: ${LIGHT_BAR}; --bq-system-bar-dark: ${DARK_BAR}; }`;
    document.head.appendChild(tokens);
    metas = [
      addMeta('(prefers-color-scheme: light)'),
      addMeta('(prefers-color-scheme: dark)'),
    ];

    statusBar = jasmine.createSpyObj('StatusBar', {
      setStyle: Promise.resolve(),
      setBackgroundColor: Promise.resolve(),
    });
    systemBars = jasmine.createSpyObj('SystemBars', {
      setStyle: Promise.resolve(),
    });
    edgeToEdge = jasmine.createSpyObj('EdgeToEdge', {
      setStatusBarColor: Promise.resolve(),
      setNavigationBarColor: Promise.resolve(),
    });
    keyboard = jasmine.createSpyObj('Keyboard', {
      setStyle: Promise.resolve(),
    });
    const fakes: ThemePlugins = {
      getPlatform: () => platform,
      darkMode: {
        init: () => Promise.resolve(),
        isDarkMode: () => Promise.resolve({ dark: systemDark }),
        addAppearanceListener: () =>
          Promise.resolve({ remove: () => Promise.resolve() }),
      },
      statusBar,
      systemBars,
      edgeToEdge,
      keyboard,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: THEME_PLUGINS, useValue: fakes },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => ({ theme_mode: themeMode }) },
        },
      ],
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    tokens.remove();
    metas.forEach((meta) => meta.remove());
    document.documentElement.classList.remove('ion-palette-dark');
  });

  function expectBars(color: string, iconStyle: 'dark-icons' | 'light-icons') {
    // Style.Light / SystemBarsStyle.Light: dark icons on a light bar.
    const style = iconStyle === 'dark-icons' ? Style.Light : Style.Dark;
    const systemStyle =
      iconStyle === 'dark-icons' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;
    expect(statusBar.setStyle).toHaveBeenCalledWith({ style });
    expect(statusBar.setBackgroundColor).toHaveBeenCalledWith({ color });
    expect(systemBars.setStyle).toHaveBeenCalledWith({ style: systemStyle });
  }

  it('gives Android cream bars with dark icons in light mode', async () => {
    await service.adjustTheme();

    expectBars(LIGHT_BAR, 'dark-icons');
    expect(edgeToEdge.setStatusBarColor).toHaveBeenCalledWith({
      color: LIGHT_BAR,
    });
    expect(edgeToEdge.setNavigationBarColor).toHaveBeenCalledWith({
      color: LIGHT_BAR,
    });
    expect(keyboard.setStyle).not.toHaveBeenCalled();
    expect(service.isDarkMode()).toBeFalse();
    expect(
      document.documentElement.classList.contains('ion-palette-dark'),
    ).toBeFalse();
  });

  it('gives Android espresso bars with light icons in dark mode', async () => {
    themeMode = THEME_MODE_ENUM.DARK;
    await service.adjustTheme();

    expectBars(DARK_BAR, 'light-icons');
    expect(edgeToEdge.setStatusBarColor).toHaveBeenCalledWith({
      color: DARK_BAR,
    });
    expect(edgeToEdge.setNavigationBarColor).toHaveBeenCalledWith({
      color: DARK_BAR,
    });
    expect(service.isDarkMode()).toBeTrue();
    expect(
      document.documentElement.classList.contains('ion-palette-dark'),
    ).toBeTrue();
  });

  it('follows the device appearance on native platforms', async () => {
    themeMode = THEME_MODE_ENUM.DEVICE;
    systemDark = true;
    await service.adjustTheme();
    expectBars(DARK_BAR, 'light-icons');

    systemDark = false;
    await service.adjustTheme();
    expectBars(LIGHT_BAR, 'dark-icons');
    expect(statusBar.setBackgroundColor.calls.mostRecent().args[0]).toEqual({
      color: LIGHT_BAR,
    });
  });

  it('styles status bar and keyboard on iOS without the Android plugin', async () => {
    platform = 'ios';
    themeMode = THEME_MODE_ENUM.DARK;
    await service.adjustTheme();

    expectBars(DARK_BAR, 'light-icons');
    expect(keyboard.setStyle).toHaveBeenCalledWith({
      style: KeyboardStyle.Dark,
    });
    expect(edgeToEdge.setStatusBarColor).not.toHaveBeenCalled();
    expect(edgeToEdge.setNavigationBarColor).not.toHaveBeenCalled();
  });

  it('applies the system appearance before the settings are loaded', async () => {
    systemDark = true;
    await service.initializeBeforeAppReady();

    expectBars(DARK_BAR, 'light-icons');
  });

  it('points every theme-color tag at the applied mode, whatever the system scheme', async () => {
    platform = 'web';
    themeMode = THEME_MODE_ENUM.DARK;
    await service.adjustTheme();
    expect(metas.map((meta) => meta.content)).toEqual([DARK_BAR, DARK_BAR]);

    themeMode = THEME_MODE_ENUM.LIGHT;
    await service.adjustTheme();
    expect(metas.map((meta) => meta.content)).toEqual([LIGHT_BAR, LIGHT_BAR]);
  });

  it('makes no native calls on the web', async () => {
    platform = 'web';
    await service.adjustTheme();

    expect(statusBar.setStyle).not.toHaveBeenCalled();
    expect(systemBars.setStyle).not.toHaveBeenCalled();
    expect(edgeToEdge.setStatusBarColor).not.toHaveBeenCalled();
  });

  it('keeps the bar colour and still sets readable icons when the token is no hex colour', async () => {
    tokens.textContent = ':root { --bq-system-bar-dark: rgb(1 2 3); }';
    themeMode = THEME_MODE_ENUM.DARK;
    await service.adjustTheme();

    expect(statusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
    expect(systemBars.setStyle).toHaveBeenCalledWith({
      style: SystemBarsStyle.Dark,
    });
    expect(statusBar.setBackgroundColor).not.toHaveBeenCalled();
    expect(edgeToEdge.setStatusBarColor).not.toHaveBeenCalled();
    expect(edgeToEdge.setNavigationBarColor).not.toHaveBeenCalled();
    expect(metas.map((meta) => meta.content)).toEqual(['initial', 'initial']);
  });
});
