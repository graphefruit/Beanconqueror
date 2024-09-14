import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beanconqueror',
  appName: 'beanconqueror',
  webDir: 'www',
  cordova: {
    preferences: {
      ScrollEnabled: 'false',
      'android-minSdkVersion': '24',
      'android-targetSdkVersion': '34',
      'android-compileSdkVersion': '34',
      'android-buildToolsVersion': '34.0.0',
      SplashMaintainAspectRatio: 'true',
      FadeSplashScreenDuration: '300',
      SplashShowOnlyFirstTime: 'false',
      SplashScreen: 'screen',
      SplashScreenDelay: '300',
      StatusBarOverlaysWebView: 'false',
      StatusBarBackgroundColor: '#F0F0F0',
      StatusBarStyle: 'light',
      AndroidPersistentFileLocation: 'Compatibility',
      AndroidExtraFilesystems:
        'files,files-external,documents,cache,cache-external',
      iosExtraFilesystems:
        'library,library-nosync,documents,documents-nosync,cache,bundle,root',
    },
  },
};

export default config;
