import {
  AfterViewInit,
  Component,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppMinimize } from '@ionic-native/app-minimize/ngx';
import { Globalization } from '@ionic-native/globalization/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import {
  ThreeDeeTouch,
  ThreeDeeTouchQuickAction,
} from '@ionic-native/three-dee-touch/ngx';
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
import { AndroidPlatformService } from '../services/androidPlatform/android-platform.service';

import { CleanupService } from '../services/cleanupService/cleanup.service';
import { IntentHandlerService } from '../services/intentHandler/intent-handler.service';
import { IosPlatformService } from '../services/iosPlatform/ios-platform.service';
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
import { Device } from '@ionic-native/device/ngx';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { Storage } from '@ionic/storage';
import 'chartjs-adapter-luxon';
import ChartStreaming from 'chartjs-plugin-streaming';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';

import { UIToast } from '../services/uiToast';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { PressureType, ScaleType, TemperatureType } from '../classes/devices';
import { Logger } from '../classes/devices/common/logger';

declare var AppRate;
declare var window;
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements AfterViewInit {
  public toggleAbout: boolean = false;
  public registerBackFunction: any;
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

  constructor(
    private readonly router: Router,
    public platform: Platform,
    public statusBar: StatusBar,
    public splashScreen: SplashScreen,
    private readonly uiLog: UILog,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly menuCtrl: MenuController,
    private readonly appMinimize: AppMinimize,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly keyboard: Keyboard,
    private readonly threeDeeTouch: ThreeDeeTouch,
    private readonly modalCtrl: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiAlert: UIAlert,
    private _translate: TranslateService,
    private globalization: Globalization,
    private readonly uiAnalytics: UIAnalytics,
    private readonly menu: MenuController,
    private readonly uiUpdate: UIUpdate,
    private readonly uiVersionStorage: UiVersionStorage,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiRoastingMachineStorage: UIRoastingMachineStorage,
    private readonly intentHandlerService: IntentHandlerService,
    private readonly iosPlatformService: IosPlatformService,
    private readonly androidPlatformService: AndroidPlatformService,
    private readonly uiWaterStorage: UIWaterStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly cleanupService: CleanupService,
    private readonly device: Device,
    private readonly appVersion: AppVersion,
    private readonly storage: Storage,
    private readonly uiToast: UIToast
  ) {
    // Dont remove androidPlatformService, we need to initialize it via constructor
    try {
      // Touch DB Factory to make sure, it is properly initialized even on iOS 14.6
      const db = window.indexedDB;
    } catch (ex) {}
    try {
      // Touch DB Factory to make sure, it is properly initialized even on iOS 14.6
      const db = window.sqlitePlugin;
    } catch (ex) {}
  }

  public ngOnInit() {}

  public ngAfterViewInit(): void {
    this.uiLog.log('Platform ready, init app');

    Chart.register(...registerables);
    Chart.register(ChartStreaming);
    Chart.register(zoomPlugin);
    Chart.register(annotationPlugin);
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
        // #285 - Add more device loggings
        this.uiLog.log(`Device-Model: ${this.device.model}`);
        this.uiLog.log(`Manufacturer: ${this.device.manufacturer}`);
        this.uiLog.log(`Platform: ${this.device.platform}`);
        this.uiLog.log(`Version: ${this.device.version}`);
        if (this.platform.is('cordova')) {
          const versionCode: string | number =
            await this.appVersion.getVersionNumber();
          this.uiLog.log(`App-Version: ${versionCode}`);
          this.uiLog.log(`Storage-Driver: ${this.storage.driver}`);
        }
      } catch (ex) {}
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

      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      // #7
      this.statusBar.show();
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.keyboard.hideFormAccessoryBar(false);
      if (environment.production === true) {
        // When we're in cordova, disable the log messages
        this.uiLog.disable();
      }
      Logger.disableLog();

      if (this.platform.is('ios')) {
        this.uiLog.log(`iOS Device - attach to home icon pressed`);
        this.threeDeeTouch.onHomeIconPressed().subscribe(async (payload) => {
          /* We need to wait for app finished loading, but already attach on platform start, else
           *  the event won't get triggered **/
          this.uiHelper.isBeanconqurorAppReady().then(async () => {
            const payloadType = payload.type;
            try {
              this.uiAnalytics.trackEvent(
                STARTUP_TRACKING.TITLE,
                STARTUP_TRACKING.ACTIONS.FORCE_TOUCH.CATEGORY,
                payloadType.toUpperCase()
              );
              this.uiLog.log(`iOS Device - Home icon was pressed`);
            } catch (ex) {}
            if (payload.type === 'Brew') {
              await this.__trackNewBrew();
            } else if (payload.type === 'Bean') {
              await this.__trackNewBean();
            } else if (payload.type === 'Preparation') {
              await this.__trackNewPreparation();
            } else if (payload.type === 'Mill') {
              await this.__trackNewMill();
            }
          });
          // returns an object that is the button you presed
        });
      }

      if (this.platform.is('cordova')) {
        // Just support deeplinks on devices.
        this.intentHandlerService.attachOnHandleOpenUrl();
      }
      // Before we update and show messages, we need atleast to set one default language.
      this._translate.setDefaultLang('en');
      await this._translate.use('en').toPromise();

      if (this.platform.is('ios')) {
        await this.__checkIOSBackup();
      } else if (this.platform.is('android')) {
        await this.__checkAndroidBackup();
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
        ]).then(
          async () => {
            this.uiLog.log('App finished loading');
            this.uiLog.info('Everything should be fine!!!');
            await this.__checkUpdate();
            await this.__checkCleanup();
            await this.__initApp();
            this.uiHelper.setAppReady(1);
          },
          async () => {
            await this.uiAlert.showAppShetItSelfMessage();
            this.uiLog.error('App finished loading, but errors occured');
          }
        );
      } catch (ex) {
        await this.uiAlert.showAppShetItSelfMessage();
        this.uiLog.error('App finished loading, but errors occured');
      }
    });
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

  private async __checkAndroidBackup() {
    try {
      await this.androidPlatformService.checkAndroidBackup();
    } catch (ex) {}
  }

  private async __checkIOSBackup() {
    try {
      await this.iosPlatformService.checkIOSBackup();
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

  private async __setDeviceLanguage(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const settings: Settings = this.uiSettingsStorage.getSettings();
      if (this.platform.is('cordova')) {
        try {
          this.uiLog.info('Its a mobile device, try to set language now');

          if (
            settings.language === null ||
            settings.language === undefined ||
            settings.language === ''
          ) {
            this.globalization
              .getPreferredLanguage()
              .then(async (res) => {
                // Run other functions after getting device default lang
                let systemLanguage: string = res['value'].toLowerCase();
                this.uiLog.log(`Found system language: ${systemLanguage}`);
                if (systemLanguage.indexOf('-') > -1) {
                  systemLanguage = systemLanguage.split('-')[0];
                }

                let settingLanguage: string = '';
                if (systemLanguage === 'de') {
                  settingLanguage = 'de';
                } else if (systemLanguage === 'es') {
                  settingLanguage = 'es';
                } else if (systemLanguage === 'tr') {
                  settingLanguage = 'tr';
                } else if (systemLanguage === 'zh') {
                  settingLanguage = 'zh';
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
              })
              .catch(async (ex) => {
                const exMessage: string = JSON.stringify(ex);
                this.uiLog.error(
                  `Exception occured when setting language ${exMessage}`
                );
                this._translate.setDefaultLang('en');
                await this._translate.use('en').toPromise();
                moment.locale('en');
                resolve(undefined);
              });
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
            `Exception occured when setting language ${exMessage}`
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
          'Cant set language for device, because no cordova device'
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
            `Set default language from settings, because no settings set: en `
          );
          this._translate.setDefaultLang('en');
          settings.language = 'en';
          await this.uiSettingsStorage.saveSettings(settings);
          await this._translate.use('en').toPromise();
          moment.locale(settings.language);
          resolve(undefined);
        }
      }
    });
  }

  private async __checkStartupView() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    if (settings.startup_view !== STARTUP_VIEW_ENUM.HOME_PAGE) {
      this.uiAnalytics.trackEvent(
        STARTUP_TRACKING.TITLE,
        STARTUP_TRACKING.ACTIONS.STARTUP_VIEW.CATEGORY,
        settings.startup_view
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

  private async __initApp() {
    this.__registerBack();
    await this.__setDeviceLanguage();
    // After we set the right device language, we check now if we can request external storage
    if (this.platform.is('cordova') && this.platform.is('android')) {
      try {
        await this.androidPlatformService.checkHasExternalStorage();
      } catch (ex) {}
    }

    this.__setThreeDeeTouchActions();
    await this.uiAnalytics.initializeTracking();
    await this.__checkWelcomePage();
    await this.__checkAnalyticsInformationPage();
    await this.uiUpdate.checkUpdateScreen();

    // #281 - Connect smartscale before checking the startup view
    setTimeout(async () => {
      // Just connect after 5 seconds, to get some time, and maybe handle all the connection errors
      if (this.platform.is('ios')) {
        const checkDevices = this.uiSettingsStorage.getSettings();
        const pressure_id: string = checkDevices.pressure_id;
        const temperature_id: string = checkDevices.temperature_id;
        const scale_id: string = checkDevices.scale_id;
        //If one of these is there, enable bluetooth
        if (pressure_id || temperature_id || scale_id) {
          await this.bleManager.enableIOSBluetooth();
        }
      } else {
        //await this.bleManager.enableBLE();
      }
      await this.__checkBluetoothDevices();
      await new Promise((resolve) => {
        setTimeout(async () => {
          resolve(undefined);
        }, 500);
      });
      this.__connectPressureDevice();
      this.__connectSmartScale();
      this.__connectTemperatureDevice();
    }, 3000);

    const settings = this.uiSettingsStorage.getSettings();
    if (
      settings.scale_log === true ||
      settings.pressure_log === true ||
      settings.temperature_log === true
    ) {
      Logger.enableLog();
    } else {
      Logger.disableLog();
    }

    await this.__checkStartupView();
    this.__instanceAppRating();
    this.__attachOnDevicePause();
    this.__attachOnDeviceResume();

    const bleSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        if (_type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE) {
          this.uiToast.showInfoToast(
            this._translate.instant('SCALE.CONNECTED_SUCCESSFULLY') +
              ' - ' +
              this.bleManager.getScale().device_name +
              ' / ' +
              this.bleManager.getScale().device_id,
            false
          );
        } else if (_type === CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE) {
          this.uiToast.showInfoToast('SCALE.DISCONNECTED_UNPLANNED');
        } else if (_type === CoffeeBluetoothServiceEvent.CONNECTED_PRESSURE) {
          this.uiToast.showInfoToast(
            this._translate.instant('PRESSURE.CONNECTED_SUCCESSFULLY') +
              ' - ' +
              this.bleManager.getPressureDevice().device_name +
              ' / ' +
              this.bleManager.getPressureDevice().device_id,
            false
          );
        } else if (
          _type === CoffeeBluetoothServiceEvent.DISCONNECTED_PRESSURE
        ) {
          this.uiToast.showInfoToast('PRESSURE.DISCONNECTED_UNPLANNED');
        } else if (
          _type === CoffeeBluetoothServiceEvent.CONNECTED_TEMPERATURE
        ) {
          this.uiToast.showInfoToast(
            this._translate.instant('TEMPERATURE.CONNECTED_SUCCESSFULLY') +
              ' - ' +
              this.bleManager.getTemperatureDevice().device_name +
              ' / ' +
              this.bleManager.getTemperatureDevice().device_id,
            false
          );
        } else if (
          _type === CoffeeBluetoothServiceEvent.DISCONNECTED_TEMPERATURE
        ) {
          this.uiToast.showInfoToast('TEMPERATURE.DISCONNECTED_UNPLANNED');
        }
      });
  }

  private async __checkBluetoothDevices() {
    const settings = this.uiSettingsStorage.getSettings();

    const pressure_id: string = settings.pressure_id;
    const temperature_id: string = settings.temperature_id;

    const searchIds: Array<any> = [];

    const scale_id: string = settings.scale_id;

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
    if (temperature_id) {
      searchIds.push(temperature_id);
    }
    try {
      if (searchIds.length > 0) {
        //Just search if we raly got id's
        this.bleManager.findDeviceWithDirectIds(searchIds, 60000);
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
        () => {}
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
        () => {}
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
        () => {}
      );
    } else {
      this.uiLog.log('Temperature device not connected, dont try to connect');
    }
  }

  private __attachOnDevicePause() {
    this.platform.pause.subscribe(async () => {
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
            false
          );
        }
      }
    });
  }
  private __attachOnDeviceResume() {
    this.platform.resume.subscribe(async () => {
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
    });
  }

  private __setThreeDeeTouchActions() {
    // Ignore for now
    if (this.platform.is('ios')) {
      const actions: ThreeDeeTouchQuickAction[] = [
        {
          type: 'Brew',
          title: this._translate.instant('THREE_DEE_TOUCH_ACTION_BREW'),
          iconType: 'Add',
        },
        {
          type: 'Bean',
          title: this._translate.instant('THREE_DEE_TOUCH_ACTION_BEAN'),
          iconType: 'Add',
        },
        {
          type: 'Preparation',
          title: this._translate.instant('THREE_DEE_TOUCH_ACTION_PREPARATION'),
          iconType: 'Add',
        },
        {
          type: 'Mill',
          title: this._translate.instant('THREE_DEE_TOUCH_ACTION_MILL'),
          iconType: 'Add',
        },
      ];

      this.threeDeeTouch.configureQuickActions(actions);
    }
  }

  private __instanceAppRating() {
    if (this.platform.is('cordova')) {
      const appLanguage = this.uiSettingsStorage.getSettings().language;
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

      AppRate.promptForRating(false);
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
        this.appMinimize.minimize();
        // or if that doesn't work, try
        // navigator['app'].exitApp();
      } else {
        this.router.navigate(['/home/dashboard'], { replaceUrl: true });
        // this.generic.showAlert("Exit", "Do you want to exit the app?", this.onYesHandler, this.onNoHandler, "backPress");
      }
    });
  }

  public openGithub() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.GITHUB
    );
    this.uiHelper.openExternalWebpage(
      'https://github.com/graphefruit/Beanconqueror'
    );
  }
  public openDiscord() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.DISCORD
    );
    this.uiHelper.openExternalWebpage('https://discord.gg/vDzA5dZjG8');
  }

  public openInstagram() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.INSTAGRAM
    );
    this.uiHelper.openExternalWebpage(
      'https://www.instagram.com/beanconqueror/'
    );
  }
  public openFacebook() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.FACEBOOK
    );
    this.uiHelper.openExternalWebpage(
      'https://www.facebook.com/Beanconqueror/'
    );
  }

  public openPaypal() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.PAYPAL
    );
    this.uiHelper.openExternalWebpage(
      'https://www.paypal.com/paypalme/LarsSaalbach'
    );
  }
  public openGithubSponsor() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.GITHUB_SPONSOR
    );
    this.uiHelper.openExternalWebpage(
      'https://github.com/sponsors/graphefruit'
    );
  }
  public openDonatePage() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.BUY_ME_A_COFFEE
    );
    this.uiHelper.openExternalWebpage('https://ko-fi.com/beanconqueror');
  }
}
