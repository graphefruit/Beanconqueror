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

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements AfterViewInit {
  public toggleAbout: boolean = false;
  public registerBackFunction: any;
   @ViewChild(IonRouterOutlet) public routerOutlet: IonRouterOutlet;

  public pages = {
    home: {title: 'Home',   url: '/home', icon: 'md-home', active: true},
    settings: {title: 'Einstellungen',   url: '/settings', icon: 'md-settings', active: false},
      brew: {title: 'Brühungen',   url: '/brew', icon: 'fa-coffee', active: false},
    beans: {title: 'Bohnen', url: '/beans', icon: 'fa-pagelines', active: false},
      preparation: {title: 'Zubereitungsmethoden',   url: '/preparation', icon: 'fa-flask', active: false},
      mill: {title: 'Mühlen',   url: '/mill', icon: 'md-cut', active: false},
    about: {title: 'Über uns', url: '/info/about', icon: 'md-information', active: false},
    contact: {title: 'Kontakt', url: '/info/contact', icon: 'md-mail', active: false},
    privacy: {title: 'Privacy', url: '/info/privacy', icon: 'md-document', active: false},
    credits: {title: 'Credits', url: '/info/credits', icon: 'md-document', active: false},
    terms: {title: 'Terms & Conditions', url: '/info/terms', icon: 'md-document', active: false},
    thanks: {title: 'Dankeschön!', url: '/info/thanks', icon: 'md-happy', active: false},
    licences: {title: 'Open-Source-Lizenzen', url: '/info/licences', icon: 'md-copy', active: false},

    statistic: {title: 'Statistiken', url: '/statistic', icon: 'md-analytics', active: false},
    logs: {title: 'Logs', url: '/info/logs', icon: 'logo-buffer', active: false}
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
    private readonly uiAlert: UIAlert
  ) {

  }

  public ngAfterViewInit(): void {

    this.uiLog.log('Platform ready, init app');
    this.__appReady();

    // Copy in all the js code from the script.js. Typescript will complain but it works just fine
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
                this.uiHelper.setAppReady(1);

              }, () => {
                this.uiAlert.showMessage('Die App konnte nicht korrekt gestartet werden, da das Dateisystem nicht verfügbar ist', 'Achtung!');
                this.uiLog.log('App finished loading');
                this.__initApp();
                this.uiHelper.setAppReady(2);
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
    // We made an update, filePath just could storage one image, but we want to storage multiple ones.
    if (this.uiBeanStorage.getAllEntries().length > 0) {
      const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
      for (const bean of beans) {
        if (bean.filePath !== undefined && bean.filePath !== null && bean.filePath !== '') {
          bean.attachments.push(bean.filePath);
          bean.filePath = '';
        }
        bean.fixDataTypes();
        this.uiBeanStorage.update(bean);
      }

    }
    // Fix wrong types
    if (this.uiBrewStorage.getAllEntries().length > 0) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      for (const brew of brews) {
        brew.fixDataTypes();
        this.uiBrewStorage.update(brew);
      }
    }
  }

  private __initApp(): void {
    this.__registerBack();


    if (this.platform.is('ios')) {
      this.threeDeeTouch.onHomeIconPressed()
          .subscribe(
            async (payload) => {
                if (payload.type === 'Brew') {
                  await this.__trackNewBrew();
                } else if (payload.type === 'Bean') {
                  await this.__trackNewBean();
                } else if (payload.type === 'Preparation') {
                  await this.__trackNewPreparation();
                } else if (payload.type === 'Mill') {
                  await this.__trackNewMill();
                }
                // returns an object that is the button you presed

              }
          );
    }
  }

  private async __trackNewBrew() {

    if (this.uiBrewHelper.canBrew()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent});
      await modal.present();
      await modal.onWillDismiss();
    }

  }

  private async __trackNewBean() {

    const modal = await this.modalCtrl.create({component: BeansAddComponent});
    await modal.present();
    await modal.onWillDismiss();

  }

  private async __trackNewPreparation() {
    const modal = await this.modalCtrl.create({component: PreparationAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.router.navigate(['/']);

  }

  private async __trackNewMill() {
    const modal = await this.modalCtrl.create({component: MillAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.router.navigate(['/']);

  }

  private __registerBack() {
    this.platform.backButton.subscribeWithPriority(0, () => {
      if (this.routerOutlet && this.routerOutlet.canGoBack()) {
        this.routerOutlet.pop();
      } else if (this.router.url === '/home') {
        this.appMinimize.minimize();
        // or if that doesn't work, try
        // navigator['app'].exitApp();
      } else {
        // this.generic.showAlert("Exit", "Do you want to exit the app?", this.onYesHandler, this.onNoHandler, "backPress");
      }
    });
  }
  /*private __registerBack(): void {
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

      if (page && !this.nav.canGoBack() && page.isHome !== undefined && page.isHome) {
        // Minimize app, that it don't need to start again.
        this.appMinimize.minimize();
        // old window['plugins'].appMinimize.minimize();

      } else if (page && !this.nav.canGoBack()) {
        // isn'T realy root.
        // this.__unregisterBack();
        this.nav.setRoot(this.ROOT_PAGE);
      } else if (this.nav.canGoBack() || view && view.isOverlay) {

        this.nav.pop({animate: false});
      }
    }, 1);

  }*/
}

