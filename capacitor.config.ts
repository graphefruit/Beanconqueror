import type { CapacitorConfig } from '@capacitor/cli';

type Platform = 'android' | 'ios';

const getPlatform: () => Platform = () => {
  /* This is slightly hacky, but it is build-time configuration and we can
   * just fail if something unexpected happens.
   * See https://github.com/ionic-team/capacitor/discussions/4173
   *
   * https://github.com/ionic-team/capacitor/issues/3976 would be a much better
   * solution if it is ever implemented, but for now this has to suffice.
   */
  const platform = process.argv[3];
  switch (platform) {
    case 'android':
      return 'android';
    case 'ios':
      return 'ios';
    case undefined:
      const errorMessage =
        '==================================================================\n' +
        'Cannot determine platform from arguments.\n' +
        'Please run platform configuration seperately, for example ' +
        '"npx cap sync android" and "npx cap sync ios" ' +
        'instead of just "npx cap sync".\n' +
        'If you just want to sync all platforms, run "npm run capsync" as a ' +
        'convenient shorcut.\n' +
        '==================================================================\n';
      console.error(errorMessage);
      throw new Error('\n' + errorMessage);
    default:
      throw new Error(`Unexpected platform argument: ${platform}`);
  }
};

const createConfig = () => {
  const config: CapacitorConfig = {
    appId: 'com.beanconqueror.app',
    appName: 'Beanconqueror',
    webDir: 'www',
    server: {
      // Will be set in platform section below
    },
    ios: {
      // Will be set in platform section below
    },
    plugins: {
      CapacitorHttp: {
        // Enabling this will patch fetch() to use CapacitorHttp instead of the
        // native fetch() in the WebView. This is required as functionality
        // such as mulipart file upload is only available using the patched
        // fetch() API and is not available using the CapacitorHttp API.
        // See https://capacitorjs.com/docs/apis/http#configuration
        enabled: true,
      },
    },
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

  switch (getPlatform()) {
    case 'android':
      // Using this hostname and scheme is required to retain access
      // to the __baristaDB on Android when updating from Cordova builds
      config.server.hostname = 'beanconqueror.com';
      config.server.androidScheme = 'https';
      break;
    case 'ios':
      // Using this hostname and scheme is required to retain access
      // to the __baristaDB on iOS when updating from Cordova builds
      config.server.hostname = 'localhost';
      config.ios.scheme = 'ionic';
      break;
  }

  return config;
};

const config: CapacitorConfig = createConfig();

export default config;
