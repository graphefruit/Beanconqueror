# Developer Instructions

This file contains instructions on how to perform Beanconqueror development work.
The instructions given are very brief, but should show you how to get started.

Make yourself familiar with our tech stack, which uses [Ionic](https://ionicframework.com/), [Angular](https://angular.dev/), and [Capacitor](https://capacitorjs.com/).
How the app is structured, and the rules for new code and tests, are described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

You need to have the following prerequisites

- Git
- Node.js 24.15 or later in the 24 line (see `.nvmrc`; `nvm use` picks it up). Angular 22 supports
  Node.js 22.22.3+, 24.15+ and 26+; odd versions such as 25 are not supported.
- `pnpm` (tested with version 10.33.0)
- Android Studio (if you want to work on the Android App)
- Xcode (if you want to work on the iOS App)

## Installing Dependencies

After cloning the repository, you need to install `pnpm` dependencies:

```shell
pnpm install --frozen-lockfile
```

### Updating Angular

Update Angular with `ng update`, which also runs Angular's migrations. With pnpm it needs a few
workarounds:

- `ng update` looks packages up with `npm`, which refuses this project because `devEngines`
  requires pnpm. `npm_config_force=true` lets it continue.
- When the installed CLI is older than the target version, `ng update` installs a temporary CLI
  inside the workspace and writes it into `pnpm-lock.yaml`. Run the target CLI with `pnpm dlx`
  and skip that step with `NG_DISABLE_VERSION_CHECK=1` instead.
- pnpm only installs versions that are at least seven days old (`minimumReleaseAge` in
  `pnpm-workspace.yaml`), so name versions that old explicitly.
- Update the packages whose peer dependencies follow Angular's major version in the same call.
- Each Angular major can raise its minimum browser versions; `ng build` then warns that browsers
  in `.browserslistrc` "fall outside Angular's browser support". Raise `.browserslistrc` and the
  native minimums with it (see "Supported platforms" in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

```shell
NG_DISABLE_VERSION_CHECK=1 npm_config_force=true pnpm dlx @angular/cli@22.2.6 update \
  @angular/core@22.2.5 @angular/cli@22.2.6 @angular/cdk@22.2.6 angular-eslint@22.6.0
```

Optional migrations run with the installed CLI, e.g.
`pnpm exec ng generate @angular/core:self-closing-tags-migration`.

## Running tests

Run unit tests through pnpm. CI runs them with coverage:

```shell
pnpm test
pnpm test:coverage # as in CI; the HTML report lands in coverage/
```

`pnpm test:coverage` fails when a file of new code has less than 80 % of its statements or lines
covered, or when no unit test loads it. New code is listed in `NEW_CODE` at the top of
`src/karma.conf.js`, and every new code structure must be added there in the commit that creates
it: a new folder as `'src/services/<feature>/**'`, a new file in a folder that is not listed with
its own path. Spec files, `__tests__` folders and files without code of their own (only types,
re-exports or an `export default` value without functions) are skipped.
An entry that matches no file fails as well, so rename or remove entries together with their
folders. The rules are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#coverage-of-new-code).

In a git worktree, Angular keeps the build cache in the main checkout, so all worktrees share it.
Its entries are keyed by file content, but code instrumented for coverage contains the file path:
another worktree with the same file would report coverage under its own path, and new code would
show as "not loaded". A patch of `@angular/build` in `patches/` adds the path to the key of
instrumented code, and `pnpm test:coverage` first checks that the patch works
(`tools/tests/coverage-cache-key.test.mjs`). When `@angular/build` is updated, carry the patch over
with `pnpm patch`, or drop it once Angular keys instrumented code by path itself.

Run the linter. It also runs in CI. Existing errors are recorded in `eslint-suppressions.json`,
so only new errors fail. If you fix existing errors, shrink the file and commit it:

```shell
pnpm lint
pnpm exec eslint "src/**/*.ts" "src/**/*.html" --prune-suppressions
```

Do not regenerate the file with `--suppress-all` to hide new errors.

`pnpm lint` also runs Stylelint on `src/**/*.scss`: `font`, `font-size` and `line-height` must not use `px`
(use the `--bq-type-*` tokens, `rem` or `em`); an exception needs a
`stylelint-disable-next-line … -- <reason>` comment.

### Browser end-to-end tests

Playwright runs user journeys against the real app in an emulated Pixel 7 (Chromium). The
accessibility, focus and announcement specs also run in an emulated iPhone 15 (WebKit), as VoiceOver
reads what Safari exposes. These run in CI.

The tests run against the development build in `www/browser`: build it with `pnpm run build`
first, and again after changing the app. Playwright serves the build on port 4300
(`e2e/tools/serve-build.ts`) and stops with a message when there is no build, when it is a
production build (the tests use Angular's development hooks such as `ng.getComponent`) or when a
file in `src` changed after it. Set `E2E_PORT` to use another port, e.g. to run two worktrees side
by side (`E2E_PORT=4310 pnpm e2e`).

```shell
pnpm exec playwright install chromium webkit # once
pnpm run build
pnpm e2e
pnpm e2e --repeat-each=5              # check a new test for flakiness
pnpm exec playwright show-report      # inspect traces and screenshots of failures
pnpm e2e:affected                     # only the specs of the areas changed since feature/relaunch
```

`pnpm e2e:affected` compares the branch, including uncommitted and new files, with
`origin/feature/relaunch` and runs the smoke test plus the specs of the changed areas; it passes
further options on to Playwright. The areas of the specs and of the source folders are listed in
`e2e/tools/areas.ts`; a changed file outside those folders (shared components, styles,
translations, test support) runs the full suite. A new spec needs an entry there, which
`pnpm test:e2e-tools` checks in CI.

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
- Lists render only the rows near the screen (`app-virtual-list`, see `docs/ARCHITECTURE.md`):
  a row out of sight is not in the page. Find a list by `VIRTUAL_LIST` and scroll it with
  `scrollToEnd()` from `e2e/support/virtual-list.ts`; the scroller is the `ion-content` around
  it. Each row is a `listitem` with `aria-setsize` and `aria-posinset` of the whole list.
- Use synthetic data only; never real user exports. Traces and screenshots are uploaded as CI
  artifacts.
- In WebKit, Tab passes over buttons and links as in Safari; press `tabKey(page)` from
  `e2e/support/keyboard.ts` to move focus like a keyboard user.
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
A11Y_UPDATE_BASELINE=1 pnpm e2e e2e/accessibility.spec.ts --project=pixel-7-chromium
git diff e2e/accessibility-baseline.json
```

axe cannot check everything; the screen reader acceptance on a device is still required.

#### Announcements

Status messages that should be spoken without moving focus, such as toasts and loading messages,
go through `Announcer` (`src/services/a11y/announcer.service.ts`), not through live regions of
their own. A second live region makes screen readers speak a message twice, and VoiceOver ignores
live regions outside an open dialog unless they are stacked above it.

Info toasts stay 2 s, or 7 s while VoiceOver or TalkBack is on (`@capacitor/screen-reader`, read
once at start and kept current through its `stateChange` event by `ScreenReaderState`,
`src/services/a11y/screen-reader-state.service.ts`; native only). Toasts with a duration of their
own keep it.

The spoken brew values (text to speech on iOS and Android: weight every
`text_to_speech_interval_rate` ms, time every `text_to_speech_brew_time_interval` s, brew start and
end, each with its own switch;
`src/services/textToSpeech/text-to-speech.service.ts`) take one of three ways:

|                            | Screen reader off                     | Screen reader on                                          |
| -------------------------- | ------------------------------------- | --------------------------------------------------------- |
| iOS                        | `@capacitor-community/text-to-speech` | VoiceOver, through `ScreenReader.speak`                   |
| Android                    | `@capacitor-community/text-to-speech` | TalkBack, from the live region of `Announcer` (assertive) |
| Browser (web build, tests) | `speechSynthesis`                     | `speechSynthesis` (the state is not known there)          |

- The graph says the weight (needs a scale) and the brew start and end. `brew-brewing` says the
  time from the brew timer's own ticks (`brewTimeToSay`), also without a scale, so the time said is
  the one shown and falls on the multiples of the interval. "Speak whole grams" drops the decimal of
  espresso weights, which the Android voice service needs noticeably longer for (`spokenWeight` in
  `speech-options.ts`). Settings of "Speak the brew time only" are moved to the switches by
  `migrateSpeechSettings`.
- Values never pile up: a weight or time due while the last one is still said replaces the one
  waiting (`enqueueAnnouncement`), in the native queue and in the live region; other messages are
  all said, in order.
- The native plugin gets the app language as a BCP 47 tag (`zh_TW` → `zh-TW`). Without a voice for
  it (`isLanguageSupported`), it speaks in the system language (`navigator.language`). A failed
  call is skipped and logged once, without the text or device details. `end()` calls its `stop()`.
- Rate and pitch keep the scale of the settings sliders, which was the scale of `speechSynthesis`
  (rate 0.1–10, pitch 0–2). Android takes them as they are. On iOS the plugin maps the rate
  differently from WebKit (`adjustRate` in its iOS source against `mapSpeechRateToPlatformRate` in
  WebKit), so `pluginSpeechRate` converts it (`speech-options.ts`) and iOS sounds as before. Pitch
  is kept within 0.5–2, where both platforms follow it; the settings default of 3 was spoken as 2
  before, too.
- Android never calls the screen reader plugin's `speak`, which starts a new TTS engine on every
  call. TalkBack reads from the app's one live region; `Announcer` drops the same text within
  `REPEAT_WINDOW_MS` (2 s), so an unchanged weight is heard every 2 s instead of every interval,
  while a changed weight is announced at once.
- A screen reader taking over during a brew stops what the app's own voice still has to say.
- The plugin's Android `stop()` (8.0.2) cleared the pending requests without settling them, so a
  `speak` cut off by the next one (`QueueStrategy.Flush`) or by `stop()` stayed in the Capacitor
  bridge until the app restarted. `patches/@capacitor-community__text-to-speech@8.0.2.patch`
  resolves them, as iOS does (`didCancel`). After a plugin update, check whether the patch is still
  needed; a changed patch changes the plugin path in `capacitor.settings.gradle` and the Podfile
  (`pnpm exec cap sync android` and `… ios`).
- The plugin binds the system TTS service when Capacitor loads it at app start (`load()` creates
  `android.speech.tts.TextToSpeech`), for every Android user, also with text to speech off; the
  plugin cannot start it later. Depending on the device this starts the TTS engine's process.
  Start time and memory have to be checked on a device.

VoiceOver announcements carry no queue attribute and TalkBack gets them assertive, so a new one
cuts off what the screen reader is still speaking. That keeps the weight current, but has two
costs:

- The time and "brew started" go through `speakInFull`, which holds back the weight for
  `SCREEN_READER_HOLD_MS` (1.5 s) so they are heard in full. At a slow speaking rate they can still
  be cut off.
- During a brew, an announcement every 250–1000 ms also cuts off what the screen reader reads while
  the user navigates (the focused element, the stop button) and messages from `Announcer`. Turning
  text to speech off ends both.

`ScreenReaderState` reads the state again on every return to the foreground, as `stateChange` can
get lost while the screen reader is switched in the system settings. Whether announcements are cut
off or dropped, whether the time is heard in full, and whether the native voice is heard with the
silent switch on, have to be checked on a device.

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

The data is that of an installation whose data migrations have all run: every entry carries the
change info (`created_at`, `updated_at`, `rev`, `updated_by`) that the change info migration
fills in for entries from before change tracking, and the settings hold the user profile of an
existing installation. The unit test runs the app's start-up update check and
`fillMissingChangeInfo()` against the data, so a new migration or change info field that the
generator does not follow fails it. Device id, deletion journal and attachment manifest are not
generated; they belong to one installation and the app creates them itself.

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

`pnpm e2e:perf` measures the app with 7,000, 15,000 and 30,000 brews
(`e2e/perf/large-data.perf.ts`) and fails when a value exceeds its budget in
`e2e/perf/budgets.ts`; `PERF_TIERS=50000 pnpm e2e:perf` measures other numbers of brews without
budgets. A run takes several minutes,
so it is not part of `pnpm e2e` or CI; run it before and after changes to storage, lists,
statistics, start-up or backups.

- It runs the production build (`ng serve --configuration production`) in an emulated Pixel 2 XL
  with the CPU throttled 4x (`Emulation.setCPUThrottlingRate`) as an approximation of an older
  Android phone. `PERF_CPU_THROTTLING=1` turns throttling off; budgets are only checked at 4x.
- The data is written into the app's IndexedDB before the app starts, as on an existing
  installation. All data migrations are marked as applied and the entries carry their change
  info, so the start includes the migration check but no migration. The import writes entries
  that already have their change info as well. The import test goes through Settings > Import with the generated ZIP.
- Measured: start until the home screen is interactive, opening the brew list and scrolling it to
  the end (time per screen height scrolled, slow frames, longest frame; the whole time also grows
  with the estimated height of the rows the fling skips), search in the brew list, opening the bean list
  (also sorted by last use),
  deleting a bean with 200 brews, deleting the grinder with the most brews, deleting the water with the most brews, statistics with the brew charts, export (from the tap until the app hands the ZIP to the
  browser) and import (from the moment the app gets the file until the success message).
- The brew charts count as drawn when every chart canvas of the segment has been painted on and
  nothing has painted on them for one second: the empty canvases are in the document long before
  their charts. The run records the painting calls on canvases for this (`brewChartsFirstDraw`,
  `brewChartsLastDraw` in the `PERF` line).
- Fixed waits of the app (the search field's 750 ms debounce, 250 ms before the brew charts and
  before the export download) are taken off before a value is compared with its budget
  (`FIXED_DELAYS` in `budgets.ts`), so budgets and their reserve cover the app's work. The
  `PERF` lines show both, e.g. `settled` and `work` for the search.
- Times come from the page's own clock: from navigation start, the tap or the file input's
  `change` event until the page itself sees the result, checked every frame, so Playwright's
  round trips and polling are not part of them. "Settled" means the content is on screen and the
  main thread had no long task for one second (for the brew charts also no painting). Every value is printed as a `PERF {…}` line.
- Times depend on the machine and on what else runs on it. The budgets are set on an Apple M2 Max
  (see `budgets.ts`). Run on an otherwise idle machine: no other test runs (also not `pnpm e2e` or
  `pnpm test` in another worktree), builds, emulators or indexing, and a laptop on power. Other
  load slows the throttled page down further; with parallel test runs values were up to 2.3 times
  the median on a quiet machine (the longest frame almost five times) and failed their budgets.
  Before and after each measurement the run checks how busy the machine is (`machineBusy` in the
  `PERF` lines, percent of all cores); above 30 % it prints a `PERF-WARNING`, and a failed budget
  mentions it.
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
   app's fixed waits (`FIXED_DELAYS`), so compare them with the totals in the `PERF` lines:
   `settled` in the `search` line and `brewCharts` in the `statistics` line, not `work` and
   `brewChartsWork`. The 250 ms before the export download only exists in the web build, so
   compare the export with `work` in the `export` line.

### Device tests

`pnpm e2e:device` measures start, lists, saving a brew, export and import automatically on a
phone connected over ADB (`e2e/device/`, `playwright.device.config.ts`). It is not part of
`pnpm e2e`: the specs end in `.device.ts`. Use a phone without personal Beanconqueror data: the
run deletes the app's data.

1. Enable USB debugging, connect the phone (`adb devices`; with several devices set
   `ANDROID_SERIAL`), unlock it and keep the screen on during the run. While the lock screen
   shows, the app is not shown and its WebView draws nothing, so the run stops with a message
   before each start if the lock screen is there.
2. Build the app with the production web bundle (needs JDK 21 as `JAVA_HOME` and the Android
   SDK), the debug build, the release build or both:

   ```shell
   pnpm e2e:device:build           # debug
   pnpm e2e:device:build:release   # release (build type measure)
   ```

3. Run the measurements (several minutes; `ANDROID_HOME` or `ADB` must point to `adb`), then
   remove the app again:

   ```shell
   pnpm e2e:device | grep '^DEVICE'
   DEVICE_TIERS=7000 DEVICE_RUNS=3 pnpm e2e:device   # one data set, three runs
   DEVICE_BUILDS=release pnpm e2e:device             # the release build
   DEVICE_BUILDS=debug,release pnpm e2e:device       # both, alternating
   adb uninstall com.beanconqueror.app
   ```

The release build is the build type `measure` in `android/app/build.gradle`: the `release`
build type (R8, resource shrinking) signed with the debug key, so no release key is needed. The
test needs WebView debugging, which only debug builds switch on by themselves. The measure build
gets its own `capacitor.config.json` with `android.webContentsDebuggingEnabled` (generated from the
synced one by the Gradle task `measureCapacitorConfig`); the synced file and the `debug` and
`release` builds stay as they are, and nothing in the app's code changes. Store builds use
`release`, so the setting cannot end up in them, also not by a forgotten `cap sync`. The measure
build is not debuggable, like the store build, so `run-as` does not work for it (see storage
below).

How it works:

- The run installs `android/app/build/outputs/apk/debug/app-debug.apk` or
  `android/app/build/outputs/apk/measure/app-measure.apk` (`DEVICE_APK_DEBUG` and
  `DEVICE_APK_RELEASE` for other files) and touches only the package `com.beanconqueror.app`.
  Both are signed with the same debug key, so `adb install -r` switches between them and keeps
  the app's data.
- Playwright connects to the app's WebView with `chromium.connectOverCDP`: with WebView debugging
  on, the app opens the DevTools socket `webview_devtools_remote_<pid>`, which `adb forward` makes
  the local port `DEVICE_CDP_PORT` (default 9333). Playwright's experimental `_android` API is
  not used: it installs driver apps of its own on the phone.
- Per data set (`DEVICE_TIERS`, default 0, 7,000 and 15,000 synthetic brews, each with 1,000
  beans) the app's data is deleted, the data set is written into the running app's IndexedDB as
  in `e2e/support/seed.ts`, and the app is stopped. The generated backup ZIP is copied into the
  app's external files directory for the import.
- Each run (`DEVICE_RUNS`, default 5) starts the app cold twice (`am force-stop`, caches kept):
  start, memory, brew list and saving a new brew; then start, bean list, export and import. The
  import puts the data set back for the next run.
- `DEVICE_BUILDS` (default `debug`) picks the builds. With several, the runs alternate (debug,
  release, debug, release, …), so a slow drift of the phone (temperature, background work) hits
  every build alike; the app is installed again at every switch. Every build first gets a
  warm-up run (run 0): its lines carry `"warmup": true` and are left out of the evaluation.
- Before and after each run the thermal status (`dumpsys thermalservice`, 0 = none) and the
  battery and skin temperatures are recorded (`thermal before`, `thermal after`). Runs with a
  thermal status above 0 or a clearly warmer phone are not comparable.
- The app is already running when the test connects, so the recording of `e2e/perf/perf.ts` is
  installed right after connecting, and times come from the page's clock as in `pnpm e2e:perf`.
  The start counts from the WebView's navigation start (`visible`, like `startVisible` in the
  budgets) and from `am start` (`fromLaunch`, device clock, including the native start and the
  splash screen). `shownOnConnect: true` means the home screen was complete before the test
  connected; that value is too late.
- The test disturbs the cold start as little as it can: the lock screen is checked before the
  start, and the wait for the app process and its DevTools socket runs in one shell on the phone
  (`pidof` and `/proc/net/unix` every 50 ms, about one short process per check) instead of one
  ADB call per check. What remains is that loop until the socket exists, the `am start -W` that
  waits for the first frame, and the DevTools connection itself, which enables a few domains in
  the WebView while the page still loads. These costs are the same for every build.
- The test answers two native dialogs, so the flows run without a person: the share sheet after
  the export (the export counts until the app opens it, like the download in the browser) and the
  file picker of the import (it returns the copied ZIP). Storage, file system and the other
  plugins are the real ones.
- "Save brew" counts until the transaction that writes the brews has completed (`written`) and
  until the form has closed (`closed`). Memory is `dumpsys meminfo` of the app process and of its
  WebView renderer (a separate process: the `sandboxed_process` of the current WebView package
  that the app started, from `dumpsys activity services`) plus the JavaScript heap, as it is
  (`jsHeapUsedKiB`) and after a garbage collection (`jsHeapAfterGcKiB`,
  `HeapProfiler.collectGarbage`). The collection runs after the process sizes are read; the step
  after a memory line starts with a clean heap, in every build alike.
- Storage is the size of the WebView's IndexedDB directory and of all private app data
  (`run-as`, debug build only) and the usage the WebView reports for the app's origin
  (`originUsageKiB`, `navigator.storage.estimate()`, both builds).
- Every value is printed as a `DEVICE {…}` line with `build`, `brews` and `run`. No budget is
  checked: the budgets are set for the throttled browser.

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

## Rolling out a major release

Checklist for a release with data updates (such as 9.0). Store consoles (Google Play Console, App
Store Connect) are operated by Lars only: he moves stages, pauses a rollout and requests reviews.
Developers prepare builds, watch the signals and write a daily summary for him.

### Before the beta

- [ ] CI is green on the release branch (unit tests, both E2E time zones).
- [ ] Device test on a Pixel and an iPad: update from the store version 8.8.2 with 30,000 brews.
      Counts of beans, brews and mills match before and after; note backup size and duration.
- [ ] Way back: a 9.0 export imports into 8.8.2 with matching counts.
- [ ] The fallback build (see below) is built once and installed over data migrated by 9.0 on a
      Pixel and an iPad, both builds with the same signature: it starts, counts match, and entries
      added and changed in it are still there after updating to the next 9.0 build.
- [ ] English and German texts are complete; other languages fall back to English.

### Beta

- [ ] External TestFlight group and closed Play test track with the store signature, so the
      real update path from the installed store version is tested.
- [ ] At least 14 days and 2 builds; 20 to 50 testers, at least 3 with more than 9,000 brews,
      several scales and machines, both platforms and one older Android phone.
- [ ] Testers export their data in 8.8 and keep the file outside the app before updating.
- [ ] Feedback goes through the existing Discord groups; testers share logs from the app.

The beta ends when all of these hold; otherwise it is extended, never skipped:

- [ ] No confirmed data loss.
- [ ] At least 15 completed updates with more than 1,000 brews, 3 of them with more than 9,000.
- [ ] No open crash or data bug.

### Staged rollout

- [ ] Start on a Tuesday or Wednesday, not between 20 December and 6 January, with Lars reachable
      for the first 72 hours. Planned for mid to late January 2027.
- [ ] Android staged rollout 5 % → 20 % → 50 % → 100 %, each stage at least 72 hours (Android
      vitals lag one to two days).
- [ ] iOS: submit for review at least 3 days ahead with manual release. Release only after a
      clean 20 % stage on Android, then use phased release over 7 days. Manual updates in the App
      Store skip the phased release, so Android goes first.
- [ ] Daily: summarise Android vitals, App Store crashes, store reviews and Discord.

### Stop criteria

Halt at once (Play Console: halt rollout; App Store Connect: pause phased release) on:

- a confirmed data loss (counts differ and are not explained by removed exact duplicates);
- Android user-perceived crash rate above 1.09 % or more than twice that of 8.8.2, ANR rate above
  0.47 %; iOS crashes per session more than twice those of 8.8.2;
- 3 or more independent reports of the same blocking bug (start, saving, scale) within 24 hours.

Do not move to the next stage while:

- a single crash or data bug is not yet reproduced;
- many users report that the backup before the data update failed;
- start time with more than 9,000 brews is more than twice that of 8.8.

Analytics are opt-in and send nothing without consent, so they are not a stop signal. There is
no crash reporting SDK.

### Hotfix

- [ ] Branch `hotfix/<version>` from the release tag; fix, test, tag.
- [ ] Android: publish the new version on the current stage.
- [ ] iOS: pause the phased release and request an expedited review in App Store Connect.
- [ ] A broken data update is fixed with a new update step or by reopening the broken one, never
      by changing an update step that has already run on user devices.
- [ ] Merge the hotfix back into the development branch.

### Fallback to 8.8

Last resort when 9.0 is broken in the stores and no hotfix can ship in time: the 8.8 code is
published with a version number above the broken 9.0, so users get it as a normal update. Only
Lars decides to use it, and only if the fallback build passed its test before the start (see
"Before the beta").

- [ ] Halt the rollout first (Play Console: halt rollout; App Store Connect: pause phased release).
- [ ] Branch `fallback/<version>` from the store tag `v8.8.2` plus the commits on `develop` after
      it, with these patches, all about data safety:
  - Before every import, write a backup file `pre-import/Beanconqueror_pre_import_<UTC>.zip`,
    named like the 9.0 backups so that 9.0 lists and rotates it. 8.8 keeps the data before an
    import only in memory, and the next change of the day overwrites the daily backup.
  - List `pre-import/Beanconqueror_pre_import_*.zip` and `pre-import/Beanconqueror_pre_migration_*.zip`
    with the automatic backups, so the backup from before the data update can be restored on
    Android.
  - Keep the credentials stored on the device when importing: files written by 9.0 hold them
    empty, and 8.8 would overwrite the stored ones.
  - Remove the `LAST_RESTORE` value on start. 8.8 does not stamp changed entries, so 9.0 could
    take the data for an unchanged import and delete that backup first when rotating.
- [ ] Version above the broken 9.0 in every number (`versionName`, `versionCode`,
      `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`), for example 9.0.1. The fixed 9.0 gets the
      next number again.
- [ ] 8.8 keeps what it does not know: new fields, settings, storage keys, data update steps and
      the backups in `pre-import/` stay. Unlike 9.0, 8.8 deletes daily backups older than eight
      days. Entries added or changed in 8.8 have no or outdated change info.
- [ ] The fixed 9.0 (for example 9.0.2) adds a new data update step that fills in the missing
      change info, after the backup like every update step. UPDATE_16 to UPDATE_19 count as done
      and do not run again.
