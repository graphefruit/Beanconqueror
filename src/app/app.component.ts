/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {Nav, Platform, IonicApp, MenuController} from 'ionic-angular';
/**Ionic native**/
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {AppMinimize} from '@ionic-native/app-minimize';


/**Pages**/
import {HomePage} from '../pages/home/home';
import {SettingsPage} from '../pages/settings/settings';
import {BeansPage} from '../pages/beans/beans'
import {BrewsPage} from '../pages/brews/brews';
import {PreparationsPage} from '../pages/preparations/preparations';
import {AboutPage} from '../pages/info/about/about';
import {ContactPage} from '../pages/info/contact/contact';
import {LicencesPage} from '../pages/info/licences/licences';
/**Serivces **/
import {UILog} from '../services/uiLog';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {UIBrewStorage} from '../services/uiBrewStorage';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {UISettingsStorage} from '../services/uiSettingsStorage';


@Component({
  templateUrl: 'app.html'
})
export class MyApp {
  @ViewChild(Nav) nav: Nav;

  rootPage: any;
  ROOT_PAGE: any = HomePage;
  registerBackFunction: any;

  pages = {
    "home": {title: 'Home', component: HomePage, icon: 'md-home', active: true},
    "brews": {title: 'Brühungen', component: BrewsPage, icon: 'fa-coffee', active: false},
    "beans": {title: 'Bohnen', component: BeansPage, icon: 'fa-pagelines', active: false},
    "preparation": {title: 'Zubereitungsmethoden', component: PreparationsPage, icon: 'fa-flask', active: false},
    "about": {title: 'Über uns', component: AboutPage, icon: 'md-information', active: false},
    "contact": {title: 'Kontakt', component: ContactPage, icon: 'md-mail', active: false},
    "licences": {title: 'Open-Source-Lizenzen', component: LicencesPage, icon: 'md-copy', active: false},
    "settings": {title: 'Einstellungen', component: SettingsPage, icon: 'md-settings', active: false},
  };

  toggleAbout: boolean = false;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen, private uiLog: UILog,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage:UIBrewStorage,
              private uiPreparationStorage: UIPreparationStorage,
              private ionicApp: IonicApp, private menuCtrl: MenuController,
              private appMinimize: AppMinimize, private uiSettingsStorage:UISettingsStorage) {



  }

  public ngAfterViewInit() {


    this.uiLog.log("Platform ready, init app");
    this.__appReady();

    //Copy in all the js code from the script.js. Typescript will complain but it works just fine
  }

  private __appReady() {
    this.platform.ready().then(() => {
      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      this.statusBar.styleDefault();
      this.splashScreen.hide();


      //Wait for every necessary service to be ready before starting the app
      let beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      let preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      let uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      let brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        uiSettingsStorageReadyCallback,
      ]).then(() => {
        this.uiLog.log("App finished loading");
        this.__initApp();
      }, () => {
        this.uiLog.log("App finished loading");
        this.__initApp();
      })
    });

  }

  private __initApp() {
    this.__registerBack();

    this.rootPage = this.ROOT_PAGE;
  }

  private __registerBack() {
    if (this.registerBackFunction != null && this.registerBackFunction != undefined) {
      return;
    }
    this.registerBackFunction = this.platform.registerBackButtonAction(() => {
      let activePortal = this.ionicApp._loadingPortal.getActive() ||
        this.ionicApp._modalPortal.getActive() ||
        this.ionicApp._toastPortal.getActive() ||
        this.ionicApp._overlayPortal.getActive();

      if (activePortal) {

        activePortal.dismiss({animate: false});
        activePortal.onDidDismiss(() => {

        });

        // Logger.log("handled with portal");
        return;
      }

      if (this.menuCtrl.isOpen()) {
        this.menuCtrl.close();

        //Logger.log("closing menu");
        return;
      }

      let view = this.nav.getActive();
      let page = view ? this.nav.getActive().instance : null;

      if (page && this.nav.canGoBack() == false && page.isHome != undefined && page.isHome == true) {
        //Minimize app, that it don't need to start again.
        this.appMinimize.minimize();
        //old window['plugins'].appMinimize.minimize();

      }
      else if (page && this.nav.canGoBack() == false) {
        //isn'T realy root.
        //this.__unregisterBack();
        this.nav.setRoot(this.ROOT_PAGE);
      }
      else if (this.nav.canGoBack() || view && view.isOverlay) {

        this.nav.pop({animate: false});
      }
      else {

      }
    }, 1);

  }


  openPage(event, page) {

    event.cancelBubble = true;
    event.preventDefault();

    // close the menu when clicking a link from the menu
    this.menuCtrl.close();
    // navigate to the new page if it is not the current page
    for (var key in this.pages) {
      this.pages[key].active = false;
    }
    page.active = true;
    this.nav.setRoot(page.component);
  }
}
