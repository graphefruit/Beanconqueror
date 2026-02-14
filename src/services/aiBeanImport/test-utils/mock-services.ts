import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

/**
 * Create a mock TranslateService for testing.
 */
export function createMockTranslateService(
  translations: Record<string, any> = {},
): jasmine.SpyObj<TranslateService> & {
  currentLang: string;
  currentLoader: { getTranslation: jasmine.Spy };
} {
  const loaderSpy = jasmine.createSpyObj('TranslateLoader', ['getTranslation']);
  loaderSpy.getTranslation.and.callFake((lang: string) => {
    return of(translations[lang] || {});
  });

  const spy = jasmine.createSpyObj('TranslateService', [
    'instant',
  ]) as jasmine.SpyObj<TranslateService> & {
    currentLang: string;
    currentLoader: { getTranslation: jasmine.Spy };
  };

  spy.instant.and.callFake((key: string) => translations[key] || key);
  spy.currentLang = 'en';
  spy.currentLoader = loaderSpy;

  return spy;
}

/**
 * Create a mock UILog that captures log calls.
 */
export function createMockUILog(): jasmine.SpyObj<any> & {
  logs: string[];
  errors: string[];
  debugLogs: string[];
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const debugLogs: string[] = [];

  const spy = jasmine.createSpyObj('UILog', ['log', 'error', 'debug']);
  spy.log.and.callFake((msg: string) => logs.push(msg));
  spy.error.and.callFake((msg: string) => errors.push(msg));
  spy.debug.and.callFake((msg: string) => debugLogs.push(msg));

  return Object.assign(spy, { logs, errors, debugLogs });
}

/**
 * Create a mock UIAlert for testing.
 */
export function createMockUIAlert(): jasmine.SpyObj<any> {
  return jasmine.createSpyObj('UIAlert', [
    'showLoadingSpinner',
    'hideLoadingSpinner',
    'setLoadingSpinnerMessage',
    'showMessage',
  ]);
}

/**
 * Create a mock UISettingsStorage for testing.
 */
export function createMockUISettingsStorage(
  settings: any = {},
): jasmine.SpyObj<any> {
  const spy = jasmine.createSpyObj('UISettingsStorage', ['getSettings']);
  spy.getSettings.and.returnValue(settings);
  return spy;
}

/**
 * Create a mock UIImage for testing.
 */
export function createMockUIImage(): jasmine.SpyObj<any> {
  return jasmine.createSpyObj('UIImage', [
    'checkCameraPermission',
    'showOptionChooser',
  ]);
}

/**
 * Create a mock UIFileHelper for testing.
 */
export function createMockUIFileHelper(): jasmine.SpyObj<any> {
  return jasmine.createSpyObj('UIFileHelper', [
    'generateInternalPath',
    'writeInternalFileFromBase64',
    'readInternalFileAsBase64',
    'deleteInternalFile',
  ]);
}

/**
 * Create a mock ModalController for testing.
 */
export function createMockModalController(): jasmine.SpyObj<any> {
  return jasmine.createSpyObj('ModalController', ['dismiss']);
}

/**
 * Create a mock Platform for testing.
 */
export function createMockPlatform(
  platforms: string[] = ['capacitor', 'ios'],
): jasmine.SpyObj<any> {
  const spy = jasmine.createSpyObj('Platform', ['is']);
  spy.is.and.callFake((platform: string) => platforms.includes(platform));
  return spy;
}
