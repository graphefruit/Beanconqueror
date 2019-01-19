/**Core**/
import {BrowserModule} from '@angular/platform-browser';
import {ErrorHandler, NgModule,CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
/**Ionic**/
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {IonicStorageModule} from '@ionic/storage';

/**Ionic native**/
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {AppMinimize} from '@ionic-native/app-minimize';
import {Camera} from '@ionic-native/camera';
import {ImagePicker} from '@ionic-native/image-picker';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppVersion } from '@ionic-native/app-version';
import { FileChooser } from '@ionic-native/file-chooser';
import {FilePath} from "@ionic-native/file-path";
import {File} from "@ionic-native/file";
import { SocialSharing } from '@ionic-native/social-sharing';
import { Keyboard } from '@ionic-native/keyboard';
import { IOSFilePicker } from '@ionic-native/file-picker';
import { ThreeDeeTouch} from '@ionic-native/three-dee-touch';
import { InAppBrowser} from '@ionic-native/in-app-browser';
/**Pages**/
import {MyApp} from './app.component';
import {HomePage} from '../pages/home/home';
import {SettingsPage} from '../pages/settings/settings';
import {BeansPage} from '../pages/beans/beans';
import {BrewsPage} from '../pages/brews/brews';
import {PreparationsPage} from '../pages/preparations/preparations';
import {AboutPage} from '../pages/info/about/about';
import {ContactPage} from '../pages/info/contact/contact';
import {LicencesPage} from '../pages/info/licences/licences';
import {TermsPage} from "../pages/info/terms/terms";
import {PrivacyPage} from "../pages/info/privacy/privacy";
import {CreditsPage} from "../pages/info/credits/credits";
/**Modals**/
import {BeansAddModal} from '../pages/beans/add/beans-add';
import {BeansEditModal} from '../pages/beans/edit/beans-edit';

import {PreparationsAddModal} from '../pages/preparations/add/preparations-add';
import {PreparationsEditModal} from '../pages/preparations/edit/preparations-edit';

import {BrewsAddModal} from '../pages/brews/add/brews-add';
import {BrewsEditModal} from '../pages/brews/edit/brews-edit';
import {BrewsDetailsModal} from '../pages/brews/details/brews-details';
import {BrewsTableModal} from '../pages/brews/table/brews-table';
import {BrewsPhotoView} from '../pages/brews/photo-view/brews-photo-view';
import { BrewsPopover } from '../pages/brews/popover/brews-popover';

/**Services**/
import {UIStorage} from '../services/uiStorage';
import {UISettingsStorage} from '../services/uiSettingsStorage';
import {UIHelper} from '../services/uiHelper';
import {UIBrewHelper} from '../services/uiBrewHelper';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {UIBrewStorage} from '../services/uiBrewStorage';
import {UILog} from '../services/uiLog';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {UIAlert} from '../services/uiAlert';
import {UIImage} from '../services/uiImage';
import {UIStatistic} from '../services/uiStatistic';
/**Pipes**/
import {FormatDatePipe} from '../pipes/formatDate';
import {KeysPipe} from '../pipes/keys';
import {ToDecimalPipe} from '../pipes/toDecimal';

/**Directive**/
import {PreventCharacterDirective} from '../directive/preventCharacters';
import {RemoveEmptyNumberDirective} from "../directive/removeEmptyNumber";
/**Components**/
import {TimerComponent} from '../components/timer/timer';
import {UIMillStorage} from "../services/uiMillStorage";
import {MillsPage} from "../pages/mill/mills";
import {MillAddModal} from "../pages/mill/add/mill-add";
import {MillEditModal} from "../pages/mill/edit/mill-edit";


@NgModule({
  declarations: [
    MyApp,
    HomePage,
    SettingsPage,
    BeansPage,
    BeansAddModal,
    BeansEditModal,
    PreparationsPage,
    PreparationsAddModal,
    PreparationsEditModal,
    CreditsPage,
    MillsPage,
    MillAddModal,
    MillEditModal,
    FormatDatePipe,
    KeysPipe,
    ToDecimalPipe,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    BrewsPage,
    BrewsAddModal, TimerComponent, BrewsEditModal,BrewsPhotoView,BrewsDetailsModal,BrewsTableModal,BrewsPopover,
    AboutPage, ContactPage, LicencesPage,TermsPage,PrivacyPage,
  ],

  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      scrollAssist: true,
      autoFocusAssist: false,
      platform:'android',
      mode:'md',
    }),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: ['indexeddb', 'sqlite', 'websql'],
    }),

  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    SettingsPage,
    BeansPage,
    BeansAddModal,
    BeansEditModal,
    PreparationsPage,
    PreparationsAddModal,
    PreparationsEditModal,
    MillsPage,
    CreditsPage,
    MillAddModal,
    MillEditModal,
    BrewsPage, BrewsAddModal, TimerComponent, BrewsEditModal,BrewsPhotoView,BrewsDetailsModal,BrewsTableModal,BrewsPopover,
    AboutPage, ContactPage, LicencesPage,TermsPage,PrivacyPage,
  ],
  providers: [
    StatusBar,
    AppVersion,
    FileChooser,
    FilePath,
    File,
    SocialSharing,
    IOSFilePicker,
    ThreeDeeTouch,
    InAppBrowser,
    Keyboard,
    SplashScreen,
    UIStorage,
    UISettingsStorage,
    UIHelper,
    UIBrewHelper,
    UILog,
    UIPreparationStorage,
    UIMillStorage,
    UIAlert,
    UIImage,
    UIBeanStorage, AppMinimize, {provide: ErrorHandler, useClass: IonicErrorHandler},
    Camera, ImagePicker,AndroidPermissions, UIBrewStorage,UIStatistic
  ],exports:[PreventCharacterDirective],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})
export class AppModule {
}
