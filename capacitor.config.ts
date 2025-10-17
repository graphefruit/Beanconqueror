import type { CapacitorConfig } from '@capacitor/cli';
import { argv, env } from 'process';
import { KeyboardResize } from '@capacitor/keyboard';

type Platform = 'android' | 'ios';
const PlatformOverrideEnvVariable = 'CAPACITOR_PLATFORM_OVERRIDE';

const validatePlatformString: (
  platformString: string,
) => Platform | undefined = (platformString) => {
  switch (platformString) {
    case 'android':
      return 'android';
    case 'ios':
      return 'ios';
    default:
      return undefined;
  }
};

const getPlatform: () => Platform = () => {
  /* This is slightly hacky, but it is build-time configuration and we can
   * just fail if something unexpected happens.
   * See https://github.com/ionic-team/capacitor/discussions/4173
   *
   * https://github.com/ionic-team/capacitor/issues/3976 would be a much better
   * solution if it is ever implemented, but for now this has to suffice.
   */

  const platformFromEnv = validatePlatformString(
    env[PlatformOverrideEnvVariable],
  );
  if (platformFromEnv) {
    return platformFromEnv;
  }

  const platformFromArgv = validatePlatformString(process.argv[3]);
  if (platformFromArgv) {
    return platformFromArgv;
  }

  const errorMessage =
    '==================================================================\n' +
    'Cannot determine platform from environment or arguments.\n' +
    `${PlatformOverrideEnvVariable} = '${env[PlatformOverrideEnvVariable]}'; ` +
    `argv[3]='${argv[3]}'\n\n` +
    'Please run platform configuration seperately, for example ' +
    '"npm run cap sync android" and "npm run cap sync ios" ' +
    'instead of just "npm run cap sync".\n' +
    'If you just want to sync all platforms, run "npm run capsync" as a ' +
    'convenient shorcut.\n' +
    'If you really need to, you can override the platform using the ' +
    `environment variable ${PlatformOverrideEnvVariable}\n` +
    '==================================================================\n';
  console.error(errorMessage);
  throw new Error('\n' + errorMessage);
};

const createConfig = () => {
  const config: CapacitorConfig = {
    appId: 'com.beanconqueror.app',
    appName: 'Beanconqueror',
    webDir: 'www',
    loggingBehavior: 'none',
    zoomEnabled: false,
    server: {
      // Will be set in platform section below
    },
    ios: {
      // Will be set in platform section below
    },
    android: {
      allowMixedContent: true, //Needed because Websockets are maybe not working with https thats why we enable it here
      adjustMarginsForEdgeToEdge: 'auto', // Needed to fix safe area / edge to edge
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
      SplashScreen: {
        launchAutoHide: false, // we will hide the splashcreen inside the app
        backgroundColor: '#000000',
        androidScaleType: 'CENTER_CROP',
        useDialog: false, // required to set the correct scale type
      },
      StatusBar: {
        overlaysWebView: false,
      },
    },
  };

  switch (getPlatform()) {
    case 'android':
      // Using this hostname and scheme is required to retain access
      // to the __baristaDB on Android when updating from Cordova builds
      config.server.hostname = 'beanconqueror.com';
      config.server.androidScheme = 'https';
      config.plugins.Keyboard = {
        resize: KeyboardResize.Native,
        resizeOnFullScreen: true,
      };
      break;
    case 'ios':
      // Using this hostname and scheme is required to retain access
      // to the __baristaDB on iOS when updating from Cordova builds
      config.server.hostname = 'localhost';
      config.server.iosScheme = 'ionic';
      break;
  }

  return config;
};

const config: CapacitorConfig = createConfig();

export default config;
