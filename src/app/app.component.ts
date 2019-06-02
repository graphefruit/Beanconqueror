/** Core */
import { Component, ViewChild } from '@angular/core';
import { AppMinimize } from '@ionic-native/app-minimize';
import { Keyboard } from '@ionic-native/keyboard';
import { SplashScreen } from '@ionic-native/splash-screen';
/** Ionic native */
import { StatusBar } from '@ionic-native/status-bar';
import { ThreeDeeTouch } from '@ionic-native/three-dee-touch';
/**  Ionic */
import { IonicApp, MenuController, ModalController, Nav, Platform } from 'ionic-angular';
import { Brew } from '../classes/brew/brew';
import { Mill } from '../classes/mill/mill';
import { BeansAddModal } from '../pages/beans/add/beans-add';
import { BeansPage } from '../pages/beans/beans';
import { BrewsAddModal } from '../pages/brews/add/brews-add';
import { BrewsPage } from '../pages/brews/brews';
/**  Pages */
import { HomePage } from '../pages/home/home';
import { AboutPage } from '../pages/info/about/about';
import { ContactPage } from '../pages/info/contact/contact';
import { CreditsPage } from '../pages/info/credits/credits';
import { LicencesPage } from '../pages/info/licences/licences';
import { PrivacyPage } from '../pages/info/privacy/privacy';
import { TermsPage } from '../pages/info/terms/terms';
import { ThanksPage } from '../pages/info/thanks/thanks';
import { MillAddModal } from '../pages/mill/add/mill-add';
import { MillsPage } from '../pages/mill/mills';
import { PreparationsAddModal } from '../pages/preparations/add/preparations-add';
import { PreparationsPage } from '../pages/preparations/preparations';
import { SettingsPage } from '../pages/settings/settings';
import { StatisticsPage } from '../pages/statistics/statistics';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewHelper } from '../services/uiBrewHelper';
import { UIBrewStorage } from '../services/uiBrewStorage';
/** Serivces */
import { UILog } from '../services/uiLog';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationStorage } from '../services/uiPreparationStorage';
import { UISettingsStorage } from '../services/uiSettingsStorage';

@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) public nav: Nav;

  public rootPage: any;
  public ROOT_PAGE: any = HomePage;
  public registerBackFunction: any;

  public pages = {
    home: {title: 'Home', component: HomePage, icon: 'md-home', active: true},
    brews: {title: 'Brühungen', component: BrewsPage, icon: 'fa-coffee', active: false},
    beans: {title: 'Bohnen', component: BeansPage, icon: 'fa-pagelines', active: false},
    preparation: {title: 'Zubereitungsmethoden', component: PreparationsPage, icon: 'fa-flask', active: false},
    mill: {title: 'Mühlen', component: MillsPage, icon: 'md-cut', active: false},
    about: {title: 'Über uns', component: AboutPage, icon: 'md-information', active: false},
    contact: {title: 'Kontakt', component: ContactPage, icon: 'md-mail', active: false},
    privacy: {title: 'Privacy', component: PrivacyPage, icon: 'md-document', active: false},
    credits: {title: 'Credits', component: CreditsPage, icon: 'md-document', active: false},
    terms: {title: 'Terms & Conditions', component: TermsPage, icon: 'md-document', active: false},
    thanks: {title: 'Dankeschön!', component: ThanksPage, icon: 'md-happy', active: false},
    licences: {title: 'Open-Source-Lizenzen', component: LicencesPage, icon: 'md-copy', active: false},
    settings: {title: 'Einstellungen', component: SettingsPage, icon: 'md-settings', active: false},
    statistics: {title: 'Statistiken', component: StatisticsPage, icon: 'md-analytics', active: false}
  };

  public toggleAbout: boolean = false;

  constructor(public platform: Platform,
              public statusBar: StatusBar,
              public splashScreen: SplashScreen,
              private uiLog: UILog,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage: UIBrewStorage,
              private uiPreparationStorage: UIPreparationStorage,
              private uiMillStorage: UIMillStorage,
              private uiBrewHelper: UIBrewHelper,
              private ionicApp: IonicApp,
              private menuCtrl: MenuController,
              private appMinimize: AppMinimize,
              private uiSettingsStorage: UISettingsStorage,
              private keyboard: Keyboard,
              private threeDeeTouch: ThreeDeeTouch,
              private modalCtrl: ModalController) {

  }

  public ngAfterViewInit(): void {

    this.uiLog.log('Platform ready, init app');
    this.__appReady();

    // Copy in all the js code from the script.js. Typescript will complain but it works just fine
  }

  public openPage(event, page): void {

    if (event) {
      event.cancelBubble = true;
      event.preventDefault();

    }

    // close the menu when clicking a link from the menu
    this.menuCtrl.close();
    // navigate to the new page if it is not the current page
    for (const key of Object.keys(this.pages)) {
      this.pages[key].active = false;
    }
    page.active = true;
    this.nav.setRoot(page.component);
  }

  private __appReady(): void {
    this.platform.ready()
      .then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.

      // #7
      this.statusBar.show();
      this.splashScreen.hide();
      this.keyboard.hideFormAccessoryBar(false);

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
        this.__checkUpdate();
        this.__initApp();

      }, () => {
        this.uiLog.log('App finished loading');
        this.__initApp();
      });
    });

  }

  private __checkUpdate(): void {
    if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <= 0) {
      // We got an update and we got no mills yet, therefore we add a Standard mill.
      const data: Mill = new Mill();
      data.name = 'Standard';
      this.uiMillStorage.add(data);

      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      for (const brew of brews) {
        brew.mill = data.config.uuid;

        this.uiBrewStorage.update(brew);
      }
    }
  }

  private __initApp(): void {
    this.__registerBack();

    this.rootPage = this.ROOT_PAGE;

    if (this.platform.is('ios'))
    this.threeDeeTouch.onHomeIconPressed()
      .subscribe(
      (payload) => {
        if (payload.type === 'Brew') {
          this.__trackNewBrew();
        } else if (payload.type === 'Bean') {
          this.__trackNewBean();
        } else if (payload.type === 'Preparation') {
          this.__trackNewPreparation();
        } else if (payload.type === 'Mill') {
          this.__trackNewMill();
        }
        // returns an object that is the button you presed

      }
    );
  }

  private __trackNewBrew(): void {

    if (this.uiBrewHelper.canBrew()) {
      const addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
      addBrewsModal.present({animate: false});
    }

  }
  private __trackNewBean(): void {

      const modal = this.modalCtrl.create(BeansAddModal, {});
      modal.present({animate: false});

  }
  private __trackNewPreparation(): void {

      const modal = this.modalCtrl.create(PreparationsAddModal, {});
      modal.present({animate: false});

  }
  private __trackNewMill(): void {

      const modal = this.modalCtrl.create(MillAddModal, {});
      modal.present({animate: false});

  }

  private __registerBack(): void {
    if (this.registerBackFunction !== undefined && this.registerBackFunction !== undefined) {
      return;
    }
    this.registerBackFunction = this.platform.registerBackButtonAction(() => {
      const activePortal = this.ionicApp._loadingPortal.getActive() ||
        this.ionicApp._modalPortal.getActive() ||
        this.ionicApp._toastPortal.getActive() ||
        this.ionicApp._overlayPortal.getActive();

      if (activePortal) {

        activePortal.dismiss({animate: false});
        // Logger.log("handled with portal");
        return;
      }

      if (this.menuCtrl.isOpen()) {
        this.menuCtrl.close();

        // Logger.log("closing menu");
        return;
      }

      const view = this.nav.getActive();
      const page = view ? this.nav.getActive().instance : undefined;

      if (page && this.nav.canGoBack() === false && page.isHome !== undefined && page.isHome === true) {
        // Minimize app, that it don't need to start again.
        this.appMinimize.minimize();
        // old window['plugins'].appMinimize.minimize();

      } else if (page && this.nav.canGoBack() === false) {
        // isn'T realy root.
        // this.__unregisterBack();
        this.nav.setRoot(this.ROOT_PAGE);
      } else if (this.nav.canGoBack() || view && view.isOverlay) {

        this.nav.pop({animate: false});
      }
    }, 1);

  }
}
