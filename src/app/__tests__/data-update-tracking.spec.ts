import { BrewInstanceHelper } from '../../classes/brew/brew';
import { Logger } from '../../classes/devices/common/logger';
import { Settings } from '../../classes/settings/settings';
import { DataUpdateSignal } from '../../services/dataUpdates/data-update-rules';
import { AppComponent } from '../app.component';

/** Runs the end of the start with every page and device step stubbed. */
async function initApp(_dataUpdate: DataUpdateSignal | undefined) {
  const trackEvent = jasmine.createSpy('trackEvent');
  const stub = () => jasmine.createSpy().and.resolveTo();
  const component = Object.assign(Object.create(AppComponent.prototype), {
    uiAnalytics: { initializeTracking: stub(), trackEvent },
    themeService: { initialize: stub() },
    uiUpdate: { checkUpdateScreen: stub() },
    uiSettingsStorage: { getSettings: () => new Settings() },
    __registerBack: stub(),
    __checkWelcomePage: stub(),
    __checkAnalyticsInformationPage: stub(),
    __checkMeticulousHelpPage: stub(),
    __checkPleaseActivateAnalyticsPage: stub(),
    __checkStartupView: stub(),
    __attachOnDevicePause: stub(),
    __attachOnDeviceResume: stub(),
    initialDataTrackings: stub(),
  }) as {
    __initApp: (_signal: DataUpdateSignal | undefined) => Promise<void>;
  };
  await component.__initApp(_dataUpdate);
  return trackEvent.calls
    .allArgs()
    .filter(([, action]) => action === 'DATA_UPDATE');
}

describe('AppComponent data update tracking at the start', () => {
  beforeEach(() => {
    // The device connect waits 3 s; it is not part of this.
    jasmine.clock().install();
    spyOn(BrewInstanceHelper, 'forgetOnChange');
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    // __initApp switches the global logger off with default settings.
    Logger.enableLog();
  });

  it('sends the outcome of the data updates once', async () => {
    expect(await initApp('open:UPDATE_17')).toEqual([
      ['STARTUP', 'DATA_UPDATE', 'open:UPDATE_17'],
    ]);
  });

  it('sends nothing when no update was open', async () => {
    expect(await initApp(undefined)).toEqual([]);
  });
});
