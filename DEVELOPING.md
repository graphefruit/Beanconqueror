# Developer Instructions

This file contains instructions on how to perform Beanconqueror development work.
The instructions given are very brief, but should show you how to get started.

Make yourself familiar with our tech stack, which uses [Ionic](https://ionicframework.com/), [Angular](https://angular.dev/), and [Capacitor](https://capacitorjs.com/).
How the app is structured, and the rules for new code and tests, are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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
Set `E2E_PORT` to use another port, e.g. to run two worktrees side by side (`E2E_PORT=4310 pnpm e2e`).

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
- Only the overlay on top is in the accessibility tree: the page and every dialog below it are
  inert and aria-hidden until it starts to close. Role locators therefore find only the top
  dialog's controls; `includeHidden: true` reaches one below it on purpose.
- Toasts and loading messages are announced from a visually hidden live region
  (`.cdk-live-announcer-element`), which holds their text for a while, so `getByText` finds a
  toast's text twice. Use `toast()` from `e2e/support/toast.ts`.
- Use synthetic data only; never real user exports. Traces and screenshots are uploaded as CI
  artifacts.
- Browser emulation does not replace testing on a real device (BLE, NFC, camera, filesystem).

#### Accessibility baseline

`e2e/accessibility.spec.ts` runs axe (WCAG 2.2 AA and best practices) on the main areas in light
and dark. Known violations are listed per area and theme in `e2e/accessibility-baseline.json` as
`<rule id> | <selector>`. Like the lint suppressions, the file may only shrink:

- A violation not in the baseline fails the test. Fix it rather than adding it.
- A baseline entry that no longer occurs fails the test as well ("please remove from
  `e2e/accessibility-baseline.json`"), so a fixed issue cannot return unnoticed.

After fixing violations, or when a markup change moves a known violation to a new selector,
regenerate the file and review the diff before committing:

```shell
A11Y_UPDATE_BASELINE=1 pnpm e2e e2e/accessibility.spec.ts
git diff e2e/accessibility-baseline.json
```

axe cannot check everything; the screen reader acceptance on a device is still required.

#### Announcements

Status messages that should be spoken without moving focus, such as toasts and loading messages,
go through `Announcer` (`src/services/a11y/announcer.service.ts`), not through live regions of
their own. A second live region makes screen readers speak a message twice, and VoiceOver ignores
live regions outside an open dialog unless they are stacked above it.

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

### Synthetic test data

`e2e/support/synthetic-data.ts` generates the data of a long-time user: 1,000 beans (about 40 %
archived, a quarter of them blends), seven preparation methods (espresso and filter, two of them
archived), four grinders, three waters and any number of brews over five years, with ratings,
notes and references to the beans, grinders, tools and water in use at the time. The same seed
and end date always produce the same data. Field names and stored values follow the model
classes; `src/test-utils/__tests__/synthetic-data.spec.ts` compares them with real instances, so
a model change that the generator does not follow fails the unit tests.

To get a backup file that the app imports under Settings > Import:

```shell
pnpm generate-test-data --brews 15000   # dist/test-data/Beanconqueror-15000-brews-seed-1.zip
pnpm generate-test-data --brews 7000 --seed 2 --end-date 2026-11-01 --out /tmp/backup.zip
```

`--file-references` adds photo and flow profile paths without the files, to check how the app
handles missing files. Without `--end-date` the data ends at the current full hour.

The command runs the TypeScript file directly in Node. That needs Node 22.18 or later (23.6 or
later in the 23 line), such as the Node 24 from `.nvmrc`; older versions cannot load the file.

### Performance budgets

`pnpm e2e:perf` measures the app with 7,000 and 15,000 brews (`e2e/perf/large-data.perf.ts`)
and fails when a value exceeds its budget in `e2e/perf/budgets.ts`. A run takes several minutes,
so it is not part of `pnpm e2e` or CI; run it before and after changes to storage, lists,
statistics, start-up or backups.

- It runs the production build (`ng serve --configuration production`) in an emulated Pixel 2 XL
  with the CPU throttled 4x (`Emulation.setCPUThrottlingRate`) as an approximation of an older
  Android phone. `PERF_CPU_THROTTLING=1` turns throttling off; budgets are only checked at 4x.
- The data is written into the app's IndexedDB before the app starts, as on an existing
  installation. All data migrations are marked as applied, so the start includes the migration
  check but no migration. The import test goes through Settings > Import with the generated ZIP.
- Measured: start until the home screen is interactive, opening the brew list and scrolling it to
  the end (duration, slow frames, longest frame), search in the brew list, opening the bean list,
  statistics with the brew charts, export (from the tap until the app hands the ZIP to the
  browser) and import (from the moment the app gets the file until the success message).
- Fixed waits of the app (the search field's 750 ms debounce, 250 ms before the brew charts and
  before the export download) are taken off before a value is compared with its budget
  (`FIXED_DELAYS` in `budgets.ts`), so budgets and their reserve cover the app's work. The
  `PERF` lines show both, e.g. `settled` and `work` for the search.
- Times come from the page's own clock: from navigation start, the tap or the file input's
  `change` event until the page itself sees the result, checked every frame, so Playwright's
  round trips and polling are not part of them. "Settled" means the content is on screen and the
  main thread had no long task for one second. Every value is printed as a `PERF {…}` line.
- Times depend on the machine and on what else runs on it. The budgets are set on an Apple M2 Max
  (see `budgets.ts`). Run on an otherwise idle machine: no other test runs (also not `pnpm e2e` or
  `pnpm test` in another worktree), builds, emulators or indexing, and a laptop on power. Other
  load slows the throttled page down further; with parallel test runs single values were up to
  70 % higher and failed their budgets. Before each test the run measures how busy the machine is
  (`machineBusy` in the `PERF` lines, percent of all cores); above 30 % it prints a
  `PERF-WARNING`, and a failed budget mentions it.
- Look at a few runs before judging a change (the `grep` also keeps the warnings):

  ```shell
  pnpm e2e:perf --repeat-each=3 | grep '^PERF'
  ```

When a budget fails, run again on an idle machine and compare with a run of the previous commit on
the same machine before concluding that the change made the app slower. When a change makes the
app faster, lower the budget. Raise a budget only with a reason in the commit message. `budgets.ts`
notes the measured values and their spread the budgets are based on.

### Measuring on a Pixel 2 XL

Browser throttling only approximates an older phone; the reference device is a Pixel 2 XL.
Measure the same flows there:

1. Build the production web bundle into a debug app (debug builds allow WebView debugging):
   `pnpm run -- build --configuration production && pnpm run -- cap run android`.
   Use an installation without personal data: the import replaces all data.
2. Generate the data and copy it to the phone:
   `pnpm generate-test-data --brews 15000`, then
   `adb push dist/test-data/Beanconqueror-15000-brews-seed-1.zip /sdcard/Download/`.
3. In the app, open Settings > Import and pick the file. Note the time until "Import successful".
4. Enable USB debugging on the phone, open `chrome://inspect` in desktop Chrome and click
   _inspect_ on the Beanconqueror WebView. Keep CPU throttling in the Performance panel off.
5. Record each flow separately:
   - Start: _Record and reload_ in the Performance panel (WebView start without the native
     splash screen); stop when the home screen shows the brew count. For the native cold start,
     `adb shell am force-stop com.beanconqueror.app` followed by
     `adb shell am start -W -n com.beanconqueror.app/com.beanconqueror.MainActivity` prints
     `TotalTime`.
   - Brews tab, then fling to the end of the list.
   - Search for `syrupy` in the brew list (the word occurs only in brew notes).
   - Beans tab; Profile > Statistics, then the Brews segment.
   - Settings > Export.
6. Read the long tasks (red corners in the Main track), the Frames track (dropped frames) and the
   time until the screen is complete. Note app version, data set and values together with the
   `pnpm e2e:perf` values of the same commit. Search and brew charts on the phone include the
   app's fixed waits (`FIXED_DELAYS`), so compare them with `settled` in the `PERF` lines, not
   with `work`; the 250 ms before the export download only exists in the web build.

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

## Store release notes

The localized "What's new" texts come from `UPDATE_TEXT_TITLE_TITLE.<version>.DESCRIPTION` in
`src/assets/i18n/*.json`. [fastlane](https://docs.fastlane.tools/) uploads them to App Store Connect
(`deliver`) and Google Play (`supply`) in one step. Only the release notes are uploaded: no builds,
screenshots or other store metadata.

Install fastlane once, for example with `brew install fastlane`.

Generate the files without uploading (written to `fastlane/metadata`, which is not committed):

```shell
python3 tools/extractTranslations.py src/assets/i18n --version 9.0.0 --fastlane fastlane/metadata
```

- The Android changelog file is named after `versionCode` from `android/app/build.gradle`; override
  it with `--version-code`.
- Google Play allows 500 characters per language. Longer texts are reduced to the section headings.
- Languages without a text for the version are skipped with a warning. `--fallback en` uses the
  English text instead, `--strict` exits with an error on any warning.
- The mapping from app language to store locale is `STORE_LOCALES` in the script. Note that `deliver`
  activates every language folder it finds as a new App Store language.

Upload (both lanes regenerate the files first and run strict unless `strict:false` is passed):

```shell
fastlane ios release_notes version:9.0.0
fastlane android release_notes version:9.0.0 track:beta
```

- `version` is the i18n key of the text, not the store version, so a hotfix such as 8.8.1 can upload
  the 8.8.0 text.
- iOS: the notes go to the version currently in preparation in App Store Connect; create it there
  first. The lane never creates or renames a version. `deliver` shows an HTML preview to confirm;
  `force:true` skips it. Nothing is submitted for review and precheck is not run.
- Android: the build with that `versionCode` must already be in a release on the given track
  (`production` by default). `validate_only:true` checks without publishing.

Credentials are read from environment variables and must be stored outside the repository:

| Variable                                                                  | Purpose                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| `APP_STORE_CONNECT_API_KEY_KEY_ID`, `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | App Store Connect API key ID and issuer ID        |
| `APP_STORE_CONNECT_API_KEY_KEY_FILEPATH`                                  | Path to the downloaded `AuthKey_<id>.p8`          |
| `APP_STORE_CONNECT_API_KEY_PATH`                                          | Alternative: path to a fastlane API key JSON file |
| `SUPPLY_JSON_KEY`                                                         | Path to the Google Play service account JSON key  |

Run the script's tests with `python3 -m unittest discover -s tools/tests`.
