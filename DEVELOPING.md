# Developer Instructions

This file contains instructions on how to perform Beanconqueror development work.
The instructions given are very brief, but should show you how to get started.

If you are unfamiliar with our tech stack, which uses [Ionic](https://ionicframework.com/), [Angular](https://angular.dev/), and [Capacitor](https://capacitorjs.com/).

## Prerequisites

You need to have the following prerequisites

- Git
- Node.js (tested with version 22)
- `npm` (tested with version 20.12.2)
- Android Studio (if you want to work on the Android App)
- Xcode (if you want to work on the iOS App)

## Installing Dependencies

After cloning the repository, you need to install `npm` dependencies:

```shell
npm install
```

## Building and Running Beanconqueror

You can perform most development work in a browser instead of running on Android or iOS.
This has the advantage that builds and reloads are generally much faster than on the native platforms.
Please note, however, that not all functionality is available in the browser.
For features such as QR code scanning or Bluetooth devices you will need develop on the mobile platforms.

### Browser

You can build the app in live reload mode using the following command:

```shell
npm start
```

After that, open http://localhost:4200/ in your browser.
It is recommended to use the browser developer tools and select a phone preset to have a sensible layout to work with.

### Mobile Apps

For mobile devices you can use multiple workflows.
In essence, all of them need to perform the following steps:

- Build the web application bundle
- Copy the web application bundle to the native platform and synchronize dependencies (if required)
- Build the native application
- Deploy it to a test device (or emulator)

#### Standalone App Workflow (Without Live Reload)

The web application bundle can be easily built using the following command:

```shell
npm run build
```

Make sure you are not running a live reload server in another terminal window to prevent conflicts.

The built bundle can be synchronized to a mobile platform project using the following command:

```shell
npm run -- cap sync <platform> # where <platform> is either 'android' or 'ios'
```

After that, you can use the respective mobile IDE (Android Studio or Xcode) to build and deploy the app.
To run the respective IDE, use the following command:

```shell
npm run -- cap open <platform> # where <platform> is either 'android' or 'ios'
```

If you want to, you can also run the following command to synchronize, build and directly deploy and run the app:

```shell
npm run -- cap run <platform> # where <platform> is either 'android' or 'ios'
```

Please note that the `cap` commands do not build the web bundle.
If you want an all-in-one command, use this: (The example is for a typical `bash`-like shell)

```shell
npm build && npm run -- cap run android
```

#### Live Reload in Native Apps

If you want to use live reload for your native app, it's actually a little easier to use the `ionic` CLI.
However, you need to understand a small quirk about our Capacitor configuration: We currently need to supply the mobile platform using an environment variable.
To do that, run the following command: (The example is for a typical `bash`-like shell)

> [!WARNING]
> This will open the development server on your external network interface.
> Proceed with caution, especially if you are currently on an untrusted network!

```shell
# <platform> is either 'android' or 'ios'.
CAPACITOR_PLATFORM_OVERRIDE=<platform> npm run -- ionic capacitor run <platform> --livereload --external
```

## Capacitor Configuration Hack

To support existing installations, we need to use very specific URL schemes and hostnames in our native apps.
To make matters worse, these differ between Android and iOS.
In order to make this happen, we need to employ a terrible hack in our Capacitor configuration, at least until https://github.com/ionic-team/capacitor/issues/3976 is resolved.

For you as a developer, this means that almost all commands involving the `capacitor` CLI (either directly or indirectly, for example through the `ionic` CLI) need to supply the current mobile platform as an environment variable.
That variable is called `CAPACITOR_PLATFORM_OVERRIDE` and valid values are `android` or `ios`.

Keep this in mind if `capacitor` or `ionic` CLI commands fail in mysterious ways.

## Create a Production build

You can create a production build of the web application (which will created more optimized and minified code) using the following command:

```shell
npm run -- build --configuration 'production'
```

You then need to sync both mobile platforms again:

```shell
npm run cap sync android && npm cap sync ios
```

After this, you can use the native IDEs to create a production-ready build of the application.
