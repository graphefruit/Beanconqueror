import {AfterViewInit, Component, ViewChild, ViewEncapsulation} from '@angular/core';

import {IonRouterOutlet, MenuController, ModalController, Platform} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {UILog} from '../services/uiLog';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {UIBrewStorage} from '../services/uiBrewStorage';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {UIMillStorage} from '../services/uiMillStorage';
import {UISettingsStorage} from '../services/uiSettingsStorage';
import {AppMinimize} from '@ionic-native/app-minimize/ngx';
import {Keyboard} from '@ionic-native/keyboard/ngx';
import {ThreeDeeTouch} from '@ionic-native/three-dee-touch/ngx';
import {Mill} from '../classes/mill/mill';
import {Brew} from '../classes/brew/brew';
import {Router} from '@angular/router';
import {BeansAddComponent} from './beans/beans-add/beans-add.component';
import {PreparationAddComponent} from './preparation/preparation-add/preparation-add.component';
import {MillAddComponent} from './mill/mill-add/mill-add.component';
import {UIBrewHelper} from '../services/uiBrewHelper';
import {BrewAddComponent} from './brew/brew-add/brew-add.component';
import {Bean} from '../classes/bean/bean';

import {UIHelper} from '../services/uiHelper';
import {UIAlert} from '../services/uiAlert';
import {TranslateService} from '@ngx-translate/core';
import {Globalization} from '@ionic-native/globalization/ngx';
import {Settings} from '../classes/settings/settings';
import {STARTUP_VIEW_ENUM} from '../enums/settings/startupView';
import {UIAnalytics} from '../services/uiAnalytics';
import {WelcomePopoverComponent} from '../popover/welcome-popover/welcome-popover.component';
/** Third party */
import moment from 'moment';
import {Preparation} from '../classes/preparation/preparation';
import {UIUpdate} from '../services/uiUpdate';


declare var AppRate;
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements AfterViewInit {
  public toggleAbout: boolean = false;
  public registerBackFunction: any;
  @ViewChild(IonRouterOutlet, {static: false}) public routerOutlet: IonRouterOutlet;

  public pages = {
    home: {title: 'NAV_HOME', url: '/', icon: 'home-outline', active: true},
    settings: {title: 'NAV_SETTINGS', url: '/settings', icon: 'settings-outline', active: false},

    info: {title: 'NAV_INFORMATION_TO_APP', url: '/info', icon: 'information-circle-outline', active: false},
    about: {title: 'NAV_ABOUT_US', url: '/info/about', icon: 'information-circle-outline', active: false},
    contact: {title: 'NAV_CONTACT', url: '/info/contact', icon: 'mail-outline', active: false},
    privacy: {title: 'NAV_PRIVACY', url: '/info/privacy', icon: 'documents-outline', active: false},
    credits: {title: 'NAV_CREDITS', url: '/info/credits', icon: 'documents-outline', active: false},
    terms: {title: 'NAV_TERMS', url: '/info/terms', icon: 'documents-outline', active: false},
    thanks: {title: 'NAV_THANKS', url: '/info/thanks', icon: 'happy-outline', active: false},
    licences: {title: 'NAV_LICENCES', url: '/info/licences', icon: 'copy-outline', active: false},

    statistic: {title: 'NAV_STATISTICS', url: '/statistic', icon: 'analytics-outline', active: false},
    logs: {title: 'NAV_LOGS', url: '/info/logs', icon: 'logo-buffer', active: false},
    helper_brew_ratio: {title: 'PAGE_HELPER_BREW_RATIO', url: '/helper/brew-ratio', icon: 'construct-outline', active: false},
    helper_water_hardness: {title: 'PAGE_HELPER_WATER_HARDNESS', url: '/helper/water-hardness', icon: 'construct-outline', active: false},
    brew_parameter: {title: 'NAV_BREW_PARAMS', url: '/brew-parameter', icon: 'construct-outline', active: false}
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
    private  globalization: Globalization,
    private readonly uiAnalytics: UIAnalytics,
    private readonly menu: MenuController,
    private readonly uiUpdate: UIUpdate
  ) {
  }

  public ngAfterViewInit(): void {

    this.uiLog.log('Platform ready, init app');
    this.__appReady();
    // Copy in all the js code from the script.js. Typescript will complain but it works just fine
  }


  public dismiss() {
    this.menu.close();
  }


  private __appReady(): void {
    this.platform.ready()
      .then(async () => {
          // Okay, so the platform is ready and our plugins are available.
          // Here you can do any higher level native things you might need.

          // #7
          this.statusBar.show();
          this.statusBar.styleBlackOpaque();
          this.splashScreen.hide();
          this.keyboard.hideFormAccessoryBar(false);


          if (this.platform.is('ios')) {
            this.uiLog.log(`iOS Device - attach to home icon pressed`);
            this.threeDeeTouch.onHomeIconPressed()
              .subscribe(
                async (payload) => {
                  /* We need to wait for app finished loading, but already attach on platform start, else
                  *  the event won't get triggered **/
                  this.uiHelper.isBeanconqurorAppReady().then(async () => {
                    const payloadType = payload.type;
                    try {
                      this.uiAnalytics.trackEvent('STARTUP', 'FORCE_TOUCH_' + payloadType.toUpperCase());
                      this.uiLog.log(`iOS Device - Home icon was pressed`);
                    } catch (ex) {
                    }
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

                }
              );
          }

          // Wait for every necessary service to be ready before starting the app
          const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
          const preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
          const uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
          const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
          const millStorageReadyCallback = this.uiMillStorage.storageReady();

          Promise.all([
            beanStorageReadyCallback,
            preparationStorageReadyCallback,
            brewStorageReadyCallback,
            uiSettingsStorageReadyCallback,
            millStorageReadyCallback
          ])
              .then(() => {
                this.uiLog.log('App finished loading');
                this.uiLog.info('Everything should be fine!!!');
                this.__checkUpdate();
                this.__initApp();
                this.uiHelper.setAppReady(1);

              }, () => {
                this.uiAlert.showMessage('APP_COULD_NOT_STARTED_CORRECTLY_BECAUSE_MISSING_FILESYSTEM', 'CARE', undefined, true);
                this.uiLog.error('App finished loading, but errors occured');
                this.__initApp();
                this.uiHelper.setAppReady(2);
              });
        });

  }

  private __checkUpdate(): void {
    this.uiUpdate.checkUpdate();
  }

  private async __setDeviceLanguage(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const settings: Settings = this.uiSettingsStorage.getSettings();
      if (this.platform.is('cordova')) {

        try {
          this.uiLog.info('Its a mobile device, try to set language now');

          if (settings.language === null || settings.language === undefined || settings.language === '') {
            this.globalization.getPreferredLanguage().then(async (res) => {
              // Run other functions after getting device default lang
              let systemLanguage: string = res['value'].toLowerCase();
              this.uiLog.log(`Found system language: ${systemLanguage}`);
              if (systemLanguage.indexOf('-') > -1) {
                systemLanguage = systemLanguage.split('-')[0];
              }

              let settingLanguage: string = '';
              if (systemLanguage === 'de'){
                settingLanguage = 'de';
              } else {
                settingLanguage = 'en';
              }

              this.uiLog.log(`Setting language: ${settingLanguage}`);
              this._translate.setDefaultLang(settingLanguage);
              settings.language = settingLanguage;
              this.uiSettingsStorage.saveSettings(settings);
              await this._translate.use(settingLanguage).toPromise();
              moment.locale(settingLanguage);
              resolve();

            })
              .catch(async (ex) => {
                const exMessage: string = JSON.stringify(ex);
                this.uiLog.error(`Exception occured when setting language ${exMessage}`);
                this._translate.setDefaultLang('en');
                await this._translate.use('en').toPromise();
                moment.locale('en');
                resolve();
              });
          } else {
            this.uiLog.info('Language settings already existing, set language');
            const settingLanguage: string = settings.language;
            this.uiLog.log(`Setting language: ${settingLanguage}`);
            this._translate.setDefaultLang(settingLanguage);
            settings.language = settingLanguage;
            this.uiSettingsStorage.saveSettings(settings);
            await this._translate.use(settingLanguage).toPromise();
            moment.locale(settingLanguage);

            resolve();

          }
        } catch (ex) {
          const exMessage: string = JSON.stringify(ex);
          this.uiLog.error(`Exception occured when setting language ${exMessage}`);
          this._translate.setDefaultLang('en');
          settings.language = 'en';
          this.uiSettingsStorage.saveSettings(settings);
          await this._translate.use('en').toPromise();
          moment.locale('en');
          resolve();
        }
      } else {
        this.uiLog.info('Cant set language for device, because no cordova device');
        if (settings.language !== null && settings.language !== undefined && settings.language !== '') {
          this.uiLog.info(`Set language from settings: ${settings.language}`);
          this._translate.setDefaultLang(settings.language);
          await this._translate.use(settings.language).toPromise();
          moment.locale(settings.language);
          resolve();
        } else {
          this.uiLog.info(`Set default language from settings, because no settings set: de `);
          this._translate.setDefaultLang('de');
          settings.language = 'de';
          this.uiSettingsStorage.saveSettings(settings);
          await this._translate.use('de').toPromise();
          moment.locale(settings.language);
          resolve();
        }

      }
    });
  }

  private async __checkStartupView() {

    const settings: Settings = this.uiSettingsStorage.getSettings();
    if (settings.startup_view !== STARTUP_VIEW_ENUM.HOME_PAGE) {
      this.uiAnalytics.trackEvent('STARTUP', 'STARTUP_VIEW_' + settings.startup_view);
    }
    switch (settings.startup_view) {
      case STARTUP_VIEW_ENUM.HOME_PAGE:
        this.router.navigate(['/home/dashboard'], {replaceUrl:true});
        break;
      case STARTUP_VIEW_ENUM.BREW_PAGE:
        this.router.navigate(['/home/brews'], {replaceUrl:true});
        break;
      case STARTUP_VIEW_ENUM.ADD_BREW:
        await this.__trackNewBrew();
        this.router.navigate(['/home/brews'], {replaceUrl:true});
        break;
    }
  }

  private async __initApp() {
    this.__registerBack();
    await this.__setDeviceLanguage();
    await this.uiAnalytics.initializeTracking().catch(() => {
      // Nothing to do, user declined tracking.
    });
    await this.__checkWelcomePage();
    await this.__checkStartupView();
    this.__instanceAppRating();



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
          android: 'InAppReview'
        },
        useLanguage: appLanguage,
      });

      AppRate.promptForRating(false);
    }
  }

  private async __trackNewBrew() {

    if (this.uiBrewHelper.canBrew()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent, id:'brew-add'});
      await modal.present();
      await modal.onWillDismiss();
    }

  }


  private async __checkWelcomePage() {

    const settings = this.uiSettingsStorage.getSettings();
    const welcomePagedShowed: boolean = settings.welcome_page_showed;

    if (!welcomePagedShowed) {
      const modal = await this.modalCtrl.create({component: WelcomePopoverComponent, id:'welcome-popover'});
      await modal.present();
      await modal.onWillDismiss();
    }
  }

  private async __trackNewBean() {
    const modal = await this.modalCtrl.create({component: BeansAddComponent, id:'bean-add',
      componentProps: {hide_toast_message: false}});
    await modal.present();
    await modal.onWillDismiss();

  }

  private async __trackNewPreparation() {
    const modal = await this.modalCtrl.create({
      component: PreparationAddComponent,
      showBackdrop: true, id: 'preparation-add', componentProps: {hide_toast_message: false}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.router.navigate(['/'], {replaceUrl:true});

  }

  private async __trackNewMill() {
    const modal = await this.modalCtrl.create({
      component: MillAddComponent,
      cssClass: 'half-bottom-modal', id:'mill-add', showBackdrop: true, componentProps: {hide_toast_message: false}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.router.navigate(['/'], {replaceUrl:true});

  }

  private __registerBack() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.router.url.indexOf('/home') === -1 && this.routerOutlet && this.routerOutlet.canGoBack() ) {
        this.routerOutlet.pop();
      } else if (this.router.url.indexOf('/home')>=0) {
        this.appMinimize.minimize();
        // or if that doesn't work, try
        // navigator['app'].exitApp();
      } else {
        this.router.navigate(['/home/dashboard'], {replaceUrl:true});
        // this.generic.showAlert("Exit", "Do you want to exit the app?", this.onYesHandler, this.onNoHandler, "backPress");
      }
    });
  }
}

