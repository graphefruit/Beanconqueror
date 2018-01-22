/**Core**/
import {BrowserModule} from '@angular/platform-browser';
import {ErrorHandler, NgModule} from '@angular/core';
/**Ionic**/
import {IonicApp, IonicErrorHandler, IonicModule} from 'ionic-angular';
import {IonicStorageModule} from '@ionic/storage';

/**Ionic native**/
import {StatusBar} from '@ionic-native/status-bar';
import {SplashScreen} from '@ionic-native/splash-screen';
import {AppMinimize} from '@ionic-native/app-minimize';
import {MediaCapture} from '@ionic-native/media-capture';
import {ImagePicker} from '@ionic-native/image-picker';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppVersion } from '@ionic-native/app-version';
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
/**Modals**/
import {BeansAddModal} from '../pages/beans/add/beans-add';
import {BeansEditModal} from '../pages/beans/edit/beans-edit';

import {PreparationsAddModal} from '../pages/preparations/add/preparations-add';
import {PreparationsEditModal} from '../pages/preparations/edit/preparations-edit';

import {BrewsAddModal} from '../pages/brews/add/brews-add';
import {BrewsEditModal} from '../pages/brews/edit/brews-edit';
import {BrewsDetailsModal} from '../pages/brews/details/brews-details';
import {BrewsPhotoView} from '../pages/brews/photo-view/brews-photo-view';
import { BrewsPopover } from '../pages/brews/popover/brews-popover';

/**Services**/
import {UIStorage} from '../services/uiStorage';
import {UISettingsStorage} from '../services/uiSettingsStorage';
import {UIHelper} from '../services/uiHelper';
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
/**Components**/
import {TimerComponent} from '../components/timer/timer';

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
    FormatDatePipe,
    KeysPipe,
    ToDecimalPipe,
    BrewsPage,
    BrewsAddModal, TimerComponent, BrewsEditModal,BrewsPhotoView,BrewsDetailsModal,BrewsPopover,
    AboutPage, ContactPage, LicencesPage
  ],

  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      scrollAssist: false,
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
    BrewsPage, BrewsAddModal, TimerComponent, BrewsEditModal,BrewsPhotoView,BrewsDetailsModal,BrewsPopover,
    AboutPage, ContactPage, LicencesPage,
  ],
  providers: [
    StatusBar,
    AppVersion,
    SplashScreen,
    UIStorage,
    UISettingsStorage,
    UIHelper,
    UILog,
    UIPreparationStorage,
    UIAlert,
    UIImage,
    UIBeanStorage, AppMinimize, {provide: ErrorHandler, useClass: IonicErrorHandler},
    MediaCapture, ImagePicker,AndroidPermissions, UIBrewStorage,UIStatistic
  ]
})
export class AppModule {
}
