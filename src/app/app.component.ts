import {
  AfterViewInit,
  Component,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Animation, StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

import {
  IonRouterOutlet,
  MenuController,
  ModalController,
  Platform,
} from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';
/** Third party */
import moment from 'moment';
import { Settings } from '../classes/settings/settings';
import LINK_TRACKING from '../data/tracking/linkTracking';
import STARTUP_TRACKING from '../data/tracking/startupTracking';
import { STARTUP_VIEW_ENUM } from '../enums/settings/startupView';
import { environment } from '../environments/environment';
import { AnalyticsPopoverComponent } from '../popover/analytics-popover/analytics-popover.component';
import { WelcomePopoverComponent } from '../popover/welcome-popover/welcome-popover.component';
import { CleanupService } from '../services/cleanupService/cleanup.service';
import { IntentHandlerService } from '../services/intentHandler/intent-handler.service';
import { UIAlert } from '../services/uiAlert';
import { UIAnalytics } from '../services/uiAnalytics';
import { UIBeanHelper } from '../services/uiBeanHelper';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewHelper } from '../services/uiBrewHelper';
import { UIBrewStorage } from '../services/uiBrewStorage';
import { UIGreenBeanStorage } from '../services/uiGreenBeanStorage';
import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIMillHelper } from '../services/uiMillHelper';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationHelper } from '../services/uiPreparationHelper';
import { UIPreparationStorage } from '../services/uiPreparationStorage';
import { UIRoastingMachineStorage } from '../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../services/uiSettingsStorage';
import { UIUpdate } from '../services/uiUpdate';
import { UiVersionStorage } from '../services/uiVersionStorage';
import { UIWaterStorage } from '../services/uiWaterStorage';
import { CoffeeBluetoothDevicesService } from '../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import {
  Logger,
  PressureType,
  RefractometerType,
  ScaleType,
  sleep,
  TemperatureType,
} from '../classes/devices';
import { UIExportImportHelper } from '../services/uiExportImportHelper';
import { register } from 'swiper/element/bundle';
import { UIGraphStorage } from '../services/uiGraphStorage.service';
import { UIStorage } from '../services/uiStorage';
import { MeticulousHelpPopoverComponent } from '../popover/meticulous-help-popover/meticulous-help-popover.component';
import { SplashScreen } from '@capacitor/splash-screen';
import { BrewInstanceHelper } from '../classes/brew/brew';
import { AndroidPlatformService } from '../services/androidPlatform/android-platform.service';
import { IosPlatformService } from '../services/iosPlatform/ios-platform.service';
import SettingsTracking from '../data/tracking/settingsTracking';
import { PREPARATION_TYPES } from '../enums/preparations/preparationTypes';
import { PleaseActivateAnalyticsPopoverComponent } from '../popover/please-activate-analytics-popover/please-activate-analytics-popover.component';
import { filter } from 'rxjs/operators';

declare var window;

register();

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements AfterViewInit {
  public toggleAbout: boolean = false;
  @ViewChild(IonRouterOutlet, { static: false })
  public routerOutlet: IonRouterOutlet;

  public pages = {
    home: { title: 'NAV_HOME', url: '/', icon: 'home-outline', active: true },
    scale: {
      title: 'SCALE',
      url: '/scale-test',
      icon: 'home-outline',
      active: true,
    },
    roasting_section: {
      title: 'NAV_ROASTING_SECTION',
      url: '/roasting-section',
      active: false,
    },
    water_section: {
      title: 'NAV_WATER_SECTION',
      url: '/water-section',
      active: false,
    },
    graph_section: {
      title: 'NAV_GRAPH_SECTION',
      url: '/graph-section',
      active: false,
    },
    baristamode: {
      title: 'NAV_BARISTAMODE_SECTION',
      url: '/baristamode',
      active: false,
      visible: false,
    },
    settings: {
      title: 'NAV_SETTINGS',
      url: '/settings',
      icon: 'settings-outline',
      active: false,
    },

    info: {
      title: 'NAV_INFORMATION_TO_APP',
      url: '/info',
      icon: 'information-circle-outline',
      active: false,
    },
    about: {
      title: 'NAV_ABOUT_US',
      url: '/info/about',
      icon: 'information-circle-outline',
      active: false,
    },
    contact: {
      title: 'NAV_CONTACT',
      url: '/info/contact',
      icon: 'mail-outline',
      active: false,
    },
    privacy: {
      title: 'NAV_PRIVACY',
      url: '/info/privacy',
      icon: 'documents-outline',
      active: false,
    },
    credits: {
      title: 'NAV_CREDITS',
      url: '/info/credits',
      icon: 'documents-outline',
      active: false,
    },
    terms: {
      title: 'NAV_TERMS',
      url: '/info/terms',
      icon: 'documents-outline',
      active: false,
    },
    thanks: {
      title: 'NAV_THANKS',
      url: '/info/thanks',
      icon: 'happy-outline',
      active: false,
    },
    licences: {
      title: 'NAV_LICENCES',
      url: '/info/licences',
      icon: 'copy-outline',
      active: false,
    },

    statistic: {
      title: 'NAV_STATISTICS',
      url: '/statistic',
      icon: 'analytics-outline',
      active: false,
    },
    logs: {
      title: 'NAV_LOGS',
      url: '/info/logs',
      icon: 'logo-buffer',
      active: false,
    },

    helper: {
      title: 'NAV_HELPER',
      url: '/helper',
      icon: 'logo-buffer',
      active: false,
    },
    helper_brew_ratio: {
      title: 'PAGE_HELPER_BREW_RATIO',
      url: '/helper/brew-ratio',
      icon: 'construct-outline',
      active: false,
    },
    helper_water_hardness: {
      title: 'PAGE_HELPER_WATER_HARDNESS',
      url: '/helper/water-hardness',
      icon: 'construct-outline',
      active: false,
    },
    brew_parameter: {
      title: 'NAV_BREW_PARAMS',
      url: '/brew-parameter',
      icon: 'construct-outline',
      active: false,
    },
    bean_parameter: {
      title: 'NAV_BEAN_PARAMS',
      url: '/bean-parameter',
      icon: 'construct-outline',
      active: false,
    },
  };

  public uiGraphSectionVisible: boolean = false;
  public uiWaterSectionVisible: boolean = false;
  public uiRoastingSectionVisible: boolean = false;

  constructor(
    private readonly router: Router,
    public platform: Platform,
    private readonly uiLog: UILog,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly modalCtrl: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiAlert: UIAlert,
    private _translate: TranslateService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly menu: MenuController,
    private readonly uiUpdate: UIUpdate,
    private readonly uiVersionStorage: UiVersionStorage,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly intentHandlerService: IntentHandlerService,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly cleanupService: CleanupService,
    private readonly uiExportImportHelper: UIExportImportHelper,
    private readonly uiGraphStorage: UIGraphStorage,
    private readonly uiStorage: UIStorage,
    private readonly androidPlatformService: AndroidPlatformService,
    private readonly iosPlatformService: IosPlatformService,
  ) {
    // Dont remove androidPlatformService && iosPlatformservice, we need to initialize it via constructor
    try {
      // Touch DB Factory to make sure, it is properly initialized even on iOS 14.6
      const _db = window.indexedDB;
    } catch (ex) {}
    try {
      // Touch DB Factory to make sure, it is properly initialized even on iOS 14.6
      const _db = window.sqlitePlugin;
    } catch (ex) {}

    if (this.platform.is('capacitor')) {
      // Just support deeplinks on devices.
      this.intentHandlerService.attachOnHandleOpenUrl();
    }
  }

  public ngOnInit() {}

  public ngAfterViewInit(): void {
    this.uiLog.log('Platform ready, init app');

    Chart.register(...registerables);
    this.__appReady();
  }

  public dismiss() {
    this.menu.close();
  }

  public isAndroid() {
    try {
      const isAndroid: boolean = this.platform.is('android');
      return isAndroid;
    } catch (ex) {
      return false;
    }
  }

  private __appReady(): void {
    this.uiLog.log(`App Ready, wait for Platform ready`);
    this.platform.ready().then(async () => {
      try {
        await SplashScreen.hide();
      } catch (ex) {}

      await this.uiStorage.init();
      try {
        const deviceInfo = await Device.getInfo();
        // #285 - Add more device loggings
        this.uiLog.log(`Device-Model: ${deviceInfo.model}`);
        this.uiLog.log(`Manufacturer: ${deviceInfo.manufacturer}`);
        this.uiLog.log(`Platform: ${deviceInfo.platform}`);
        this.uiLog.log(`Version: ${deviceInfo.osVersion}`);
        this.uiLog.log(`WebView version: ${deviceInfo.webViewVersion}`);

        if (this.platform.is('capacitor')) {
          const versionCode = (await App.getInfo()).version;
          this.uiLog.log(`App-Version: ${versionCode}`);
          this.uiLog.log(
            `Storage-Driver: ${this.uiStorage.getStorage().driver}`,
          );
        }
      } catch (ex) {}

      // Track page views on route changes
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          try {
            const pageName = this.getPageNameFromUrl(event.urlAfterRedirects);
            this.uiAnalytics.trackPage(pageName);
          } catch (ex) {}
        });

      try {
        Logger.attachOnLog().subscribe((_msg) => {
          if (_msg.type === 'LOG') {
            this.uiLog.log(_msg.log);
          }
          if (_msg.type === 'INFO') {
            this.uiLog.info(_msg.log);
          }
          if (_msg.type === 'ERROR') {
            this.uiLog.error(_msg.log);
          }
          if (_msg.type === 'DEBUG') {
            this.uiLog.debug(_msg.log);
          }
        });
      } catch (ex) {}

      if (this.platform.is('capacitor')) {
        // Okay, so the platform is ready and our plugins are available.
        // Here you can do any higher level native things you might need.
        // #7
        await StatusBar.show({ animation: Animation.None });
        const statusBarStyle = Style.Default;
        await StatusBar.setStyle({ style: statusBarStyle });
        if (this.platform.is('ios')) {
          await Keyboard.setAccessoryBarVisible({ isVisible: true });
        }
      }
      if (environment.production === true) {
        // When we're in cordova, disable the log messages
        this.uiLog.disable();
      }
      Logger.disableLog();

      if (this.platform.is('ios')) {
        this.uiLog.log(`iOS Device - attach to home icon pressed`);
        // Thanks to the solution here: https://forum.ionicframework.com/t/how-to-implement-quick-actions-home-screen-for-ionic-capacitor-app/235690/2
        window.handleQuickAction = (type: any) => {
          this.uiHelper.isBeanconqurorAppReady().then(async () => {
            const payloadType = type;
            try {
              this.uiAnalytics.trackEvent(
                STARTUP_TRACKING.TITLE,
                STARTUP_TRACKING.ACTIONS.FORCE_TOUCH.CATEGORY,
                payloadType.toUpperCase(),
              );
              this.uiLog.log(`iOS Device - Home icon was pressed`);
            } catch (ex) {}
            if (payloadType === 'Brew') {
              await this.__trackNewBrew();
            } else if (payloadType === 'Bean') {
              await this.__trackNewBean();
            } else if (payloadType === 'Preparation') {
              await this.__trackNewPreparation();
            } else if (payloadType === 'Mill') {
              await this.__trackNewMill();
            }
          });
        };
      }

      // Before we update and show messages, we need atleast to set one default language.
      this._translate.setDefaultLang('en');
      await this._translate.use('en').toPromise();

      await SplashScreen.hide();

      if (this.platform.is('capacitor')) {
        try {
          await this.uiExportImportHelper.checkBackup();
        } catch (ex) {}
        if (this.uiAlert.isLoadingSpinnerShown()) {
          this.uiAlert.hideLoadingSpinner();
        }
      }

      try {
        await this.uiBeanStorage.initializeStorage();
        await this.uiPreparationStorage.initializeStorage();
        await this.uiSettingsStorage.initializeStorage();
        await this.uiBrewStorage.initializeStorage();
        await this.uiMillStorage.initializeStorage();
        await this.uiVersionStorage.initializeStorage();
        await this.uiGreenBeanStorage.initializeStorage();
        await this.uiRoastingMachineStorage.initializeStorage();
        await this.uiWaterStorage.initializeStorage();
        await this.uiGraphStorage.initializeStorage();

        // Wait for every necessary service to be ready before starting the app
        // Settings and version, will create a new object on start, so we need to wait for this in the end.
        const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
        const preparationStorageReadyCallback =
          this.uiPreparationStorage.storageReady();
        const uiSettingsStorageReadyCallback =
          this.uiSettingsStorage.storageReady();
        const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
        const millStorageReadyCallback = this.uiMillStorage.storageReady();
        const versionStorageReadyCallback =
          this.uiVersionStorage.storageReady();
        const greenBeanStorageCallback = this.uiGreenBeanStorage.storageReady();
        const roastingMachineStorageCallback =
          this.uiRoastingMachineStorage.storageReady();
        const waterStorageCallback = this.uiWaterStorage.storageReady();
        const graphStorageCallback = this.uiGraphStorage.storageReady();

        Promise.all([
          beanStorageReadyCallback,
          preparationStorageReadyCallback,
          brewStorageReadyCallback,
          uiSettingsStorageReadyCallback,
          millStorageReadyCallback,
          versionStorageReadyCallback,
          greenBeanStorageCallback,
          roastingMachineStorageCallback,
          waterStorageCallback,
          graphStorageCallback,
        ]).then(
          async () => {
            this.uiLog.log('App finished loading');
            await this.__checkUpdate();
            await this.__checkCleanup();
            await this.__initApp();
            this.uiHelper.setAppReady(1);
          },
          async () => {
            await this.uiAlert.showAppShetItSelfMessage();
            this.uiLog.error('App finished loading, but errors occured');
          },
        );
      } catch (ex) {
        await this.uiAlert.showAppShetItSelfMessage();
        this.uiLog.error('App finished loading, but errors occured');
      }
    });
  }

  /**
   * Extract page name from URL for tracking
   * @param url The URL to process
   * @returns Formatted page name
   */
  private getPageNameFromUrl(url: string): string {
    // Remove leading slash and query parameters
    let pageName = url.split('?')[0];
    if (pageName.startsWith('/')) {
      pageName = pageName.substring(1);
    }

    // Format empty path as 'Home'
    if (!pageName) {
      return 'Home';
    }

    // Convert kebab-case to readable format with capitalization
    return pageName
      .split('/')
      .map((segment) =>
        segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      )
      .join(' - ');
  }

  private async __checkUpdate() {
    try {
      await this.uiUpdate.checkUpdate();
    } catch (ex) {}
  }

  private async __checkCleanup() {
    try {
      await this.cleanupService.cleanupOldBrewData();
    } catch (ex) {}
  }

  public showRoastingSection() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.show_roasting_section;
  }

  public showWaterSection() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.show_water_section;
  }

  public showGraphSection() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.show_graph_section;
  }

  private async __setDeviceLanguage(): Promise<any> {
    return new Promise(async (resolve, _reject) => {
      const settings: Settings = this.uiSettingsStorage.getSettings();
      if (this.platform.is('capacitor')) {
        try {
          this.uiLog.info('Its a mobile device, try to set language now');

          if (
            settings.language === null ||
            settings.language === undefined ||
            settings.language === ''
          ) {
            try {
              // Run other functions after getting device default lang
              let systemLanguage: string = navigator.language.toLowerCase();
              this.uiLog.log(`Found system language: ${systemLanguage}`);
              if (systemLanguage.indexOf('-') > -1) {
                systemLanguage = systemLanguage.split('-')[0];
              }

              let settingLanguage: string;
              if (systemLanguage === 'de') {
                settingLanguage = 'de';
              } else if (systemLanguage === 'es') {
                settingLanguage = 'es';
              } else if (systemLanguage === 'tr') {
                settingLanguage = 'tr';
              } else if (systemLanguage === 'zh') {
                settingLanguage = 'zh';
              } else if (systemLanguage === 'fr') {
                settingLanguage = 'fr';
              } else if (systemLanguage === 'id') {
                settingLanguage = 'id';
              } else if (systemLanguage === 'nl') {
                settingLanguage = 'nl';
              } else if (systemLanguage === 'no') {
                settingLanguage = 'no';
              } else if (systemLanguage === 'pt') {
                settingLanguage = 'pt';
              } else {
                settingLanguage = 'en';
              }
              this.uiLog.log(`Setting language: ${settingLanguage}`);
              this._translate.setDefaultLang(settingLanguage);
              settings.language = settingLanguage;
              await this.uiSettingsStorage.saveSettings(settings);
              await this._translate.use(settingLanguage).toPromise();
              moment.locale(settingLanguage);
              resolve(undefined);
            } catch (ex) {
              const exMessage: string = JSON.stringify(ex);
              this.uiLog.error(
                `Exception occured when setting language ${exMessage}`,
              );
              this._translate.setDefaultLang('en');
              await this._translate.use('en').toPromise();
              moment.locale('en');
              resolve(undefined);
            }
          } else {
            this.uiLog.info('Language settings already existing, set language');
            const settingLanguage: string = settings.language;
            this.uiLog.log(`Setting language: ${settingLanguage}`);
            this._translate.setDefaultLang(settingLanguage);
            await this._translate.use(settingLanguage).toPromise();
            moment.locale(settingLanguage);
            resolve(undefined);
          }
        } catch (ex) {
          const exMessage: string = JSON.stringify(ex);
          this.uiLog.error(
            `Exception occured when setting language ${exMessage}`,
          );
          this._translate.setDefaultLang('en');
          settings.language = 'en';
          await this.uiSettingsStorage.saveSettings(settings);
          await this._translate.use('en').toPromise();
          moment.locale('en');
          resolve(undefined);
        }
      } else {
        this.uiLog.info(
          'Cant set language for device, because no cordova device',
        );
        if (
          settings.language !== null &&
          settings.language !== undefined &&
          settings.language !== ''
        ) {
          this.uiLog.info(`Set language from settings: ${settings.language}`);
          this._translate.setDefaultLang(settings.language);
          await this._translate.use(settings.language).toPromise();
          moment.locale(settings.language);
          resolve(undefined);
        } else {
          this.uiLog.info(
            `Set default language from settings, because no settings set: en `,
          );
          this._translate.setDefaultLang('en');
          settings.language = 'en';
          await this.uiSettingsStorage.saveSettings(settings);
          await this._translate.use('en').toPromise();
          moment.locale(settings.language);
          resolve(undefined);
        }
      }

      this.uiAnalytics.trackEvent(
        SettingsTracking.TITLE,
        SettingsTracking.ACTIONS.USED_LANGUAGE,
        settings.language,
      );
    });
  }

  private async __checkStartupView() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    if (settings.startup_view !== STARTUP_VIEW_ENUM.HOME_PAGE) {
      this.uiAnalytics.trackEvent(
        STARTUP_TRACKING.TITLE,
        STARTUP_TRACKING.ACTIONS.STARTUP_VIEW.CATEGORY,
        settings.startup_view,
      );
    }
    switch (settings.startup_view) {
      case STARTUP_VIEW_ENUM.HOME_PAGE:
        this.router.navigate(['/home/dashboard'], { replaceUrl: true });
        break;
      case STARTUP_VIEW_ENUM.BREW_PAGE:
        this.router.navigate(['/home/brews'], { replaceUrl: true });
        break;
      case STARTUP_VIEW_ENUM.ADD_BREW:
        await this.__trackNewBrew();
        this.router.navigate(['/home/brews'], { replaceUrl: true });
        break;
      case STARTUP_VIEW_ENUM.BEANS_PAGE:
        this.router.navigate(['/home/beans'], { replaceUrl: true });
        break;
    }
  }

  /**
   * If settings are changed, we set the ui params, to not have callbacks all day long
   * @private
   */
  private setUIParams() {
    const settings = this.uiSettingsStorage.getSettings();
    this.uiGraphSectionVisible = settings.show_graph_section;
    this.uiWaterSectionVisible = settings.show_water_section;
    this.uiRoastingSectionVisible = settings.show_roasting_section;
  }

  private async __initApp() {
    this.setUIParams();

    this.__registerBack();
    await this.__setDeviceLanguage();

    await this.uiAnalytics.initializeTracking();
    await this.__checkWelcomePage();
    await this.__checkAnalyticsInformationPage();
    await this.uiUpdate.checkUpdateScreen();

    await this.__checkMeticulousHelpPage();

    await this.__checkPleaseActivateAnalyticsPage();

    // #281 - Connect smartscale before checking the startup view
    setTimeout(async () => {
      // Just connect after 5 seconds, to get some time, and maybe handle all the connection errors
      if (this.platform.is('ios')) {
        const checkDevices = this.uiSettingsStorage.getSettings();
        const pressure_id: string = checkDevices.pressure_id;
        const temperature_id: string = checkDevices.temperature_id;
        const scale_id: string = checkDevices.scale_id;
        const refractometer_id: string = checkDevices.refractometer_id;
        // If one of these is there, enable bluetooth
        if (pressure_id || temperature_id || scale_id || refractometer_id) {
          await this.bleManager.enableIOSBluetooth();
        }
      } else {
        // await this.bleManager.enableBLE();
      }
      await this.__checkBluetoothDevices();
      await sleep(500);
      this.__connectPressureDevice();
      this.__connectSmartScale();
      this.__connectTemperatureDevice();
      this.__connectRefractometerDevice();
    }, 3000);

    const settings = this.uiSettingsStorage.getSettings();
    if (
      settings.scale_log === true ||
      settings.pressure_log === true ||
      settings.temperature_log === true ||
      settings.refractometer_log === true
    ) {
      Logger.enableLog();
    } else {
      Logger.disableLog();
    }

    await this.__checkStartupView();
    //this.__instanceAppRating();
    this.__attachOnDevicePause();
    this.__attachOnDeviceResume();

    this.checkAndActivateTheBaristaModeIfNeeded();
    /**If Anything changes, we reset**/
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      BrewInstanceHelper.setEntryAmountBackToZero();
    });
    this.uiBeanStorage.attachOnEvent().subscribe((_val) => {
      BrewInstanceHelper.setEntryAmountBackToZero();
    });
    this.uiPreparationStorage.attachOnEvent().subscribe((_val) => {
      BrewInstanceHelper.setEntryAmountBackToZero();
      this.checkAndActivateTheBaristaModeIfNeeded();
    });
    this.uiMillStorage.attachOnEvent().subscribe((_val) => {
      BrewInstanceHelper.setEntryAmountBackToZero();
    });
    this.uiSettingsStorage.attachOnEvent().subscribe(() => {
      this.setUIParams();
    });
  }

  private checkAndActivateTheBaristaModeIfNeeded() {
    if (this.pages.baristamode.visible === false) {
      const settings = this.uiSettingsStorage.getSettings();
      /** If we find a sanremo you preparation device, we enable the baristamode**/
      if (
        this.uiPreparationStorage
          .getAllEntries()
          .find((e) => !e.finished && e.type === PREPARATION_TYPES.SANREMO_YOU)
      ) {
        this.pages.baristamode.visible = true;
      }
    }
  }

  private async __checkBluetoothDevices() {
    const settings = this.uiSettingsStorage.getSettings();

    const pressure_id: string = settings.pressure_id;
    const temperature_id: string = settings.temperature_id;

    const searchIds: Array<any> = [];

    const scale_id: string = settings.scale_id;

    const refractometer_id: string = settings.refractometer_id;

    let isAndroidAndPressureDevice: boolean = false;
    if (this.platform.is('android') && pressure_id) {
      isAndroidAndPressureDevice = true;
      // Try to find the pressure device firstly, and then we scall for the rest.
      await this.bleManager.findDeviceWithDirectId(pressure_id, 6000);
    }
    if (scale_id) {
      searchIds.push(scale_id);
    }
    if (pressure_id && isAndroidAndPressureDevice === false) {
      searchIds.push(pressure_id);
    }
    if (temperature_id && !this.platform.is('android')) {
      searchIds.push(temperature_id);
    }
    if (refractometer_id && !this.platform.is('android')) {
      searchIds.push(refractometer_id);
    }
    try {
      if (searchIds.length > 0) {
        // Just search if we raly got id's
        await this.bleManager.findDeviceWithDirectIds(searchIds, 8000);
      }
    } catch (ex) {}
  }

  private __connectSmartScale() {
    const settings = this.uiSettingsStorage.getSettings();
    const scale_id: string = settings.scale_id;
    const scale_type: ScaleType = settings.scale_type;
    this.uiLog.log(`Connect smartscale? ${scale_id}`);
    if (scale_id !== undefined && scale_id !== '') {
      this.bleManager.autoConnectScale(
        scale_type,
        scale_id,
        false,
        () => {},
        () => {},
      );
    } else {
      this.uiLog.log('Smartscale not connected, dont try to connect');
    }
  }

  private __connectPressureDevice() {
    const settings = this.uiSettingsStorage.getSettings();
    const pressure_id: string = settings.pressure_id;
    const pressure_type: PressureType = settings.pressure_type;

    this.uiLog.log(`Connect pressure device? ${pressure_id}`);
    if (pressure_id !== undefined && pressure_id !== '') {
      this.bleManager.autoConnectPressureDevice(
        pressure_type,
        pressure_id,
        false,
        () => {},
        () => {},
      );
    } else {
      this.uiLog.log('Pressure device not connected, dont try to connect');
    }
  }

  private __connectTemperatureDevice() {
    const settings = this.uiSettingsStorage.getSettings();
    const temperature_id: string = settings.temperature_id;
    const temperature_type: TemperatureType = settings.temperature_type;

    this.uiLog.log(`Connect temperature device? ${temperature_id}`);
    if (temperature_id !== undefined && temperature_id !== '') {
      this.bleManager.autoConnectTemperatureDevice(
        temperature_type,
        temperature_id,
        false,
        () => {},
        () => {},
      );
    } else {
      this.uiLog.log('Temperature device not connected, dont try to connect');
    }
  }

  private __connectRefractometerDevice() {
    const settings = this.uiSettingsStorage.getSettings();
    const refractometer_id: string = settings.refractometer_id;
    const refractometer_type: RefractometerType = settings.refractometer_type;

    this.uiLog.log(`Connect refractometer device? ${refractometer_id}`);
    if (refractometer_id !== undefined && refractometer_id !== '') {
      this.bleManager.autoConnectRefractometerDevice(
        refractometer_type,
        refractometer_id,
        false,
        () => {},
        () => {},
      );
    } else {
      this.uiLog.log('Refractometer device not connected, dont try to connect');
    }
  }

  private __attachOnDevicePause() {
    App.addListener('pause', async () => {
      this.uiHelper.setActualAppState(false);
      const settings: Settings = this.uiSettingsStorage.getSettings();
      if (settings.bluetooth_scale_stay_connected === false) {
        const decent_scale_id: string = settings.scale_id;
        if (decent_scale_id !== undefined && decent_scale_id !== '') {
          // Don't show message on device pause.
          this.bleManager.disconnect(settings.scale_id, false);
        }
      }

      if (settings.pressure_stay_connected === false) {
        const pressure_id: string = settings.pressure_id;
        if (pressure_id !== undefined && pressure_id !== '') {
          // Don't show message on device pause.
          this.bleManager.disconnectPressureDevice(settings.pressure_id, false);
        }
      }

      if (settings.temperature_stay_connected === false) {
        const temperature_id: string = settings.temperature_id;
        if (temperature_id !== undefined && temperature_id !== '') {
          // Don't show message on device pause.
          this.bleManager.disconnectTemperatureDevice(
            settings.temperature_id,
            false,
          );
        }
      }

      if (settings.refractometer_stay_connected === false) {
        const refractometer_id: string = settings.refractometer_id;
        if (refractometer_id !== undefined && refractometer_id !== '') {
          // Don't show message on device pause.
          this.bleManager.disconnectRefractometerDevice(
            settings.refractometer_id,
            false,
          );
        }
      }
      BrewInstanceHelper.setEntryAmountBackToZero();
    });
  }

  private __attachOnDeviceResume() {
    App.addListener('resume', async () => {
      this.uiHelper.setActualAppState(true);
      this.uiLog.log('App resumed');
      const settings: Settings = this.uiSettingsStorage.getSettings();
      if (settings.bluetooth_scale_stay_connected === false) {
        this.__connectSmartScale();
      }
      if (settings.pressure_stay_connected === false) {
        this.__connectPressureDevice();
      }
      if (settings.temperature_stay_connected === false) {
        this.__connectTemperatureDevice();
      }
      if (settings.refractometer_stay_connected === false) {
        this.__connectRefractometerDevice();
      }

      /**
       * IMPORTANT Why do we do this? Because the IndexedDB loses connection,
       * and we just pull an entry which does not have many entries in the end
       */
      if (this.platform.is('ios')) {
        this.uiStorage.get('MILL').then(
          () => {},
          () => {},
        );
      }
    });
  }

  private __instanceAppRating() {
    if (this.platform.is('capacitor')) {
      /** const appLanguage = this.uiSettingsStorage.getSettings().language;
       AppRate.setPreferences({
       usesUntilPrompt: 25,
       storeAppURL: {
       ios: '1445297158',
       android: 'market://details?id=com.beanconqueror.app',
       },
       promptAgainForEachNewVersion: false,
       reviewType: {
       ios: 'AppStoreReview',
       android: 'InAppReview',
       },
       useLanguage: appLanguage,
       });

       AppRate.promptForRating(false);**/
    }
  }

  private async __trackNewBrew() {
    if (this.uiBrewHelper.canBrew()) {
      await this.uiBrewHelper.addBrew();
      this.router.navigate(['/home/brews'], { replaceUrl: true });
    }
  }

  private async __checkWelcomePage() {
    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;

    if (!welcomePagedShowed) {
      const modal = await this.modalCtrl.create({
        component: WelcomePopoverComponent,
        id: 'welcome-popover',
      });
      await modal.present();
      await modal.onWillDismiss();
    }
  }

  private async __checkMeticulousHelpPage() {
    return;
    const settings = this.uiSettingsStorage.getSettings();

    if (settings.meticulous_help_was_shown === false) {
      if (
        this.uiBrewStorage.getAllEntries().length > 10 ||
        this.uiBeanStorage.getAllEntries().length > 5
      ) {
        const modal = await this.modalCtrl.create({
          component: MeticulousHelpPopoverComponent,
          id: MeticulousHelpPopoverComponent.POPOVER_ID,
        });
        await modal.present();
        await modal.onWillDismiss();
      }
    }
  }

  private async __checkPleaseActivateAnalyticsPage() {
    const settings = this.uiSettingsStorage.getSettings();
    if (settings.matomo_analytics === false) {
      if (
        this.uiBrewStorage.getAllEntries().length >= 100 ||
        this.uiBeanStorage.getAllEntries().length >= 20
      ) {
        let pleaseAsk: boolean = false;
        if (settings.matomo_analytics_last_question === 0) {
          pleaseAsk = true;
        } else {
          if (
            moment(new Date()).diff(
              moment.unix(settings.matomo_analytics_last_question),
              'days',
            ) >= 30
          ) {
            pleaseAsk = true;
          }
        }

        if (pleaseAsk) {
          const modal = await this.modalCtrl.create({
            component: PleaseActivateAnalyticsPopoverComponent,
            id: PleaseActivateAnalyticsPopoverComponent.POPOVER_ID,
          });
          await modal.present();
          await modal.onWillDismiss();
        }
      }
    }
  }

  private async __checkAnalyticsInformationPage() {
    const settings = this.uiSettingsStorage.getSettings();
    const matomo_analytics: boolean = settings.matomo_analytics;
    if (matomo_analytics === undefined) {
      const modal = await this.modalCtrl.create({
        component: AnalyticsPopoverComponent,
        id: AnalyticsPopoverComponent.POPOVER_ID,
      });
      await modal.present();
      await modal.onWillDismiss();
    }
  }

  private async __trackNewBean() {
    await this.uiBeanHelper.addBean();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private async __trackNewPreparation() {
    await this.uiPreparationHelper.addPreparation();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private async __trackNewMill() {
    await this.uiMillHelper.addMill();
    this.router.navigate(['/'], { replaceUrl: true });
  }

  private __registerBack() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      // NAvigation handler
      if (
        this.router.url.indexOf('/home') === -1 &&
        this.routerOutlet &&
        this.routerOutlet.canGoBack()
      ) {
        this.routerOutlet.pop();
      } else if (this.router.url.indexOf('/home') >= 0) {
        App.minimizeApp();
      } else {
        this.router.navigate(['/home/dashboard'], { replaceUrl: true });
        // this.generic.showAlert("Exit", "Do you want to exit the app?", this.onYesHandler, this.onNoHandler, "backPress");
      }
    });
  }

  public openGithub() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.GITHUB,
    );
    this.uiHelper.openExternalWebpage(
      'https://github.com/graphefruit/Beanconqueror',
    );
  }

  public openDiscord() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.DISCORD,
    );
    this.uiHelper.openExternalWebpage('https://discord.gg/vDzA5dZjG8');
  }

  public openInstagram() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.INSTAGRAM,
    );
    this.uiHelper.openExternalWebpage(
      'https://www.instagram.com/beanconqueror/',
    );
  }

  public openFacebook() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.FACEBOOK,
    );
    this.uiHelper.openExternalWebpage(
      'https://www.facebook.com/Beanconqueror/',
    );
  }

  public openPaypal() {}

  public openGithubSponsor() {}

  public openDonatePage() {}
}
