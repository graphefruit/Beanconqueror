# Developer Instructions

This file contains instructions on how to perform Beanconqueror development work.
The instructions given are very brief, but should show you how to get started.

Make yourself familiar with our tech stack, which uses [Ionic](https://ionicframework.com/), [Angular](https://angular.dev/), and [Capacitor](https://capacitorjs.com/).

## Prerequisites

You need to have the following prerequisites

- Git
- Node.js 24 (see `.nvmrc`; `nvm use` picks it up)
- `pnpm` (tested with version 10.33.0)
- Android Studio (if you want to work on the Android App)
- Xcode (if you want to work on the iOS App)

## Installing Dependencies

After cloning the repository, you need to install `pnpm` dependencies:

```shell
pnpm install --frozen-lockfile
```

## Running tests

Run unit tests through pnpm. These are run automatically in CI.

```shell
pnpm test
```

Run the linter. It also runs in CI. Existing errors are recorded in `eslint-suppressions.json`,
so only new errors fail. If you fix existing errors, shrink the file and commit it:

```shell
pnpm lint
pnpm exec eslint "src/**/*.ts" "src/**/*.html" --prune-suppressions
```

Do not regenerate the file with `--suppress-all` to hide new errors.

### Browser end-to-end tests

Playwright runs user journeys against the real app in an emulated Pixel 7 (Chromium). It starts
its own dev server on port 4300, so nothing needs to be running beforehand. These run in CI.

```shell
pnpm exec playwright install chromium # once
pnpm e2e
pnpm e2e --repeat-each=5              # check a new test for flakiness
pnpm exec playwright show-report      # inspect traces and screenshots of failures
```

- Import `test`/`expect` from `e2e/fixtures.ts`. Each test starts with empty storage, `en-US`
  locale and no permissions. Page errors, console errors and requests leaving the app fail the
  test; mock required external calls with `page.route`.
- Locate elements by role and accessible name and assert what a user can observe. Avoid CSS
  selectors and fixed waits.
- Use synthetic data only; never real user exports. Traces and screenshots are uploaded as CI
  artifacts.
- Browser emulation does not replace testing on a real device (BLE, NFC, camera, filesystem).

#### Native plugins

The app runs as the `web` platform, so Capacitor plugins use their web implementations and
`platform.is('capacitor')` branches are skipped. The `native` fixture (`e2e/support/native.ts`)
sits at the plugin boundary, below all app code; nothing of it is part of the app build.

- Every test attaches a `native-calls` trace to the report: Capacitor plugin calls and reads of
  Cordova plugin globals (`ble`, `NfcPlugin`, …).
- Mock a Capacitor plugin only when a journey needs it, before `page.goto`, typed against the
  plugin's interface. Throw `NativeError` to simulate cancellation or a denied permission;
  `native.emit()` fires plugin events and `native.activeListeners()` checks listener cleanup.

  ```ts
  await native.mockCapacitor<CameraPlugin>('Camera', {
    getPhoto: () => {
      throw new NativeError('User denied access to camera');
    },
  });
  ```

- A mocked plugin has no defaults: a call without a handler is rejected and fails the test.
- Cordova plugins (e.g. BLE) are globals and can be replaced the same way once a feature needs
  it. Flows guarded by `platform.is('capacitor')` are not reachable in the browser.
- Browser tests prove how the app reacts to plugin results. They do not prove real Bluetooth
  devices, native storage/SQLite, file system paths, OS permission dialogs, background timing or
  plugin behavior on Android/iOS; check those on a device for the relevant feature.

## Building and Running Beanconqueror

You can perform most development work in a browser instead of running on Android or iOS.
This has the advantage that builds and reloads are generally much faster than on the native platforms.
Please note, however, that not all functionality is available in the browser.
For features such as QR code scanning or Bluetooth devices you will need develop on the mobile platforms.

### Browser

You can build the app in live reload mode using the following command:

```shell
pnpm start
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
pnpm run build
```

Make sure you are not running a live reload server in another terminal window to prevent conflicts.

The built bundle can be synchronized to a mobile platform project using the following command:

```shell
pnpm run -- cap sync <platform> # where <platform> is either 'android' or 'ios'
```

After that, you can use the respective mobile IDE (Android Studio or Xcode) to build and deploy the app.
To run the respective IDE, use the following command:

```shell
pnpm run -- cap open <platform> # where <platform> is either 'android' or 'ios'
```

If you want to, you can also run the following command to synchronize, build and directly deploy and run the app:

```shell
pnpm run -- cap run <platform> # where <platform> is either 'android' or 'ios'
```

Please note that the `cap` commands do not build the web bundle.
If you want an all-in-one command, use this: (The example is for a typical `bash`-like shell)

```shell
pnpm build && pnpm run -- cap run android
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
CAPACITOR_PLATFORM_OVERRIDE=<platform> pnpm run -- ionic capacitor run <platform> --livereload --external
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
pnpm run -- build --configuration 'production'
```

You then need to sync both mobile platforms again:

```shell
pnpm run cap sync android && pnpm cap sync ios
```

After this, you can use the native IDEs to create a production-ready build of the application.

Normal debug builds can be created using the following command:

```shell
pnpm run -- build  && pnpm run capsync
```

Normal production builds can be created using the following command:

```shell
pnpm run -- build --configuration 'production' && pnpm run capsync
```

Generate from the bean.proto:

```shell
 pnpm run generate_proto
```
