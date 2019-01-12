/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {Nav, Platform, IonicApp, MenuController, ModalController} from 'ionic-angular';
import { AppVersion } from '@ionic-native/app-version';
import { ThreeDeeTouch, ThreeDeeTouchQuickAction, ThreeDeeTouchForceTouch } from '@ionic-native/three-dee-touch';
/**Ionic native**/
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {AppMinimize} from '@ionic-native/app-minimize';
import {Keyboard} from '@ionic-native/keyboard';


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
import {PrivacyPage} from "../pages/info/privacy/privacy";
import {TermsPage} from "../pages/info/terms/terms";
import {BrewsAddModal} from "../pages/brews/add/brews-add";
import {MillsPage} from "../pages/mill/mills";
import {UIMillStorage} from "../services/uiMillStorage";
import {Mill} from "../classes/mill/mill";
import {IBrew} from "../interfaces/brew/iBrew";
import {Brew} from "../classes/brew/brew";
import {UIBrewHelper} from "../services/uiBrewHelper";
import {BeansAddModal} from "../pages/beans/add/beans-add";
import {PreparationsAddModal} from "../pages/preparations/add/preparations-add";
import {MillAddModal} from "../pages/mill/add/mill-add";


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
    "mill": {title: 'Mühlen', component: MillsPage, icon: 'md-cut', active: false},
    "about": {title: 'Über uns', component: AboutPage, icon: 'md-information', active: false},
    "contact": {title: 'Kontakt', component: ContactPage, icon: 'md-mail', active: false},
    "privacy": {title: 'Privacy', component: PrivacyPage, icon: 'md-document', active: false},
    "terms": {title: 'Terms & Conditions', component: TermsPage, icon: 'md-document', active: false},
    "licences": {title: 'Open-Source-Lizenzen', component: LicencesPage, icon: 'md-copy', active: false},
    "settings": {title: 'Einstellungen', component: SettingsPage, icon: 'md-settings', active: false},
  };

  toggleAbout: boolean = false;

  constructor(public platform: Platform, public statusBar: StatusBar, public splashScreen: SplashScreen, private uiLog: UILog,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage:UIBrewStorage,
              private uiPreparationStorage: UIPreparationStorage,
              private uiMillStorage:UIMillStorage,
              private uiBrewHelper:UIBrewHelper,
              private ionicApp: IonicApp, private menuCtrl: MenuController,
              private appMinimize: AppMinimize, private uiSettingsStorage:UISettingsStorage, private keyboard:Keyboard,
              private threeDeeTouch: ThreeDeeTouch, private modalCtrl:ModalController) {



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

      //#7
      this.statusBar.show();
      this.splashScreen.hide();
      this.keyboard.hideFormAccessoryBar(false);




      //Wait for every necessary service to be ready before starting the app
      let beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      let preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      let uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      let brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      let millStorageReadyCallback = this.uiMillStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        uiSettingsStorageReadyCallback,
        millStorageReadyCallback,
      ]).then(() => {
        this.uiLog.log("App finished loading");
        this.__checkUpdate();
        this.__initApp();

      }, () => {
        this.uiLog.log("App finished loading");
        this.__initApp();
      })
    });

  }

  private __checkUpdate() {
    if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <=0)
    {
      //We got an update and we got no mills yet, therefore we add a Standard mill.
      let data:Mill = new Mill();
      data.name = "Standard";
      this.uiMillStorage.add(data);

      let brews:Array<Brew> = this.uiBrewStorage.getAllEntries();
      for (let i=0;i<brews.length;i++)
      {
        brews[i].mill = data.config.uuid;

        this.uiBrewStorage.update(brews[i]);
      }
    }
  }

  private __initApp() {
    this.__registerBack();

    this.rootPage = this.ROOT_PAGE;

    if (this.platform.is("ios"))
    this.threeDeeTouch.onHomeIconPressed().subscribe(
      (payload) => {
        console.log(payload);
        if (payload.type =="Brew")
        {
          this.__trackNewBrew();
        }
        else if (payload.type == "Bean")
        {
          this.__trackNewBean();
        }
        else if (payload.type == "Preparation")
        {
          this.__trackNewPreparation();
        }
        else if (payload.type =="Mill")
        {
          this.__trackNewMill();
        }
        // returns an object that is the button you presed

      }
    )
  }

  private __trackNewBrew(){


    if (this.uiBrewHelper.canBrew())
    {
      let addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
      addBrewsModal.onDidDismiss(() => {

      });
      addBrewsModal.present({animate: false});
    }

  }
  private __trackNewBean(){


      let modal = this.modalCtrl.create(BeansAddModal, {});
      modal.onDidDismiss(() => {

      });
      modal.present({animate: false});


  }
  private __trackNewPreparation(){

      let modal = this.modalCtrl.create(PreparationsAddModal, {});
      modal.onDidDismiss(() => {

      });
      modal.present({animate: false});


  }
  private __trackNewMill(){



      let modal = this.modalCtrl.create(MillAddModal, {});
      modal.onDidDismiss(() => {

      });
      modal.present({animate: false});


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

    if (event)
    {
      event.cancelBubble = true;
      event.preventDefault();

    }

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
