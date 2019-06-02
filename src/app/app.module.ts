/** Core */
import { CUSTOM_ELEMENTS_SCHEMA, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AndroidPermissions } from '@ionic-native/android-permissions';
import { AppMinimize } from '@ionic-native/app-minimize';
import { AppVersion } from '@ionic-native/app-version';
import { Camera } from '@ionic-native/camera';
import { File } from '@ionic-native/file';
import { FileChooser } from '@ionic-native/file-chooser';
import { FilePath } from '@ionic-native/file-path';
import { IOSFilePicker } from '@ionic-native/file-picker';
import { ImagePicker } from '@ionic-native/image-picker';
import { InAppBrowser } from '@ionic-native/in-app-browser';
import { Keyboard } from '@ionic-native/keyboard';
import { SocialSharing } from '@ionic-native/social-sharing';
import { SplashScreen } from '@ionic-native/splash-screen';
/** Ionic native */
import { StatusBar } from '@ionic-native/status-bar';
import { ThreeDeeTouch } from '@ionic-native/three-dee-touch';
import { IonicStorageModule } from '@ionic/storage';
/** Ionic */
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
/** Modals */
import { BeansAddModal } from '../pages/beans/add/beans-add';
import { BeansPage } from '../pages/beans/beans';
import { BeansEditModal } from '../pages/beans/edit/beans-edit';
import { BrewsPage } from '../pages/brews/brews';
import { HomePage } from '../pages/home/home';
import { AboutPage } from '../pages/info/about/about';
import { ContactPage } from '../pages/info/contact/contact';
import { CreditsPage } from '../pages/info/credits/credits';
import { LicencesPage } from '../pages/info/licences/licences';
import { PrivacyPage } from '../pages/info/privacy/privacy';
import { TermsPage } from '../pages/info/terms/terms';
import { ThanksPage } from '../pages/info/thanks/thanks';
import { PreparationsPage } from '../pages/preparations/preparations';
import { SettingsPage } from '../pages/settings/settings';
import { StatisticsPage } from '../pages/statistics/statistics';
/** Pages */
import { MyApp } from './app.component';

import { PreparationsAddModal } from '../pages/preparations/add/preparations-add';
import { PreparationsEditModal } from '../pages/preparations/edit/preparations-edit';

/** Components */

import { TimerComponent } from '../components/timer/timer';
/** Directive */
import { PreventCharacterDirective } from '../directive/preventCharacters';
import { RemoveEmptyNumberDirective } from '../directive/removeEmptyNumber';
import { BrewsAddModal } from '../pages/brews/add/brews-add';
import { BrewsDetailsModal } from '../pages/brews/details/brews-details';
import { BrewsEditModal } from '../pages/brews/edit/brews-edit';
import { BrewsPhotoView } from '../pages/brews/photo-view/brews-photo-view';
import { BrewsPopover } from '../pages/brews/popover/brews-popover';
import { BrewsTableModal } from '../pages/brews/table/brews-table';
import { BrewsTextModal } from '../pages/brews/text/brews-text';
import { MillAddModal } from '../pages/mill/add/mill-add';
import { MillEditModal } from '../pages/mill/edit/mill-edit';
import { MillsPage } from '../pages/mill/mills';
/** Pipes */
import { FormatDatePipe } from '../pipes/formatDate';
import { KeysPipe } from '../pipes/keys';
import { ToDecimalPipe } from '../pipes/toDecimal';
import { UIAlert } from '../services/uiAlert';
import { UIBeanStorage } from '../services/uiBeanStorage';
import { UIBrewHelper } from '../services/uiBrewHelper';
import { UIBrewStorage } from '../services/uiBrewStorage';
import { UIHelper } from '../services/uiHelper';
import { UIImage } from '../services/uiImage';
import { UILog } from '../services/uiLog';
import { UIMillStorage } from '../services/uiMillStorage';
import { UIPreparationStorage } from '../services/uiPreparationStorage';
import { UISettingsStorage } from '../services/uiSettingsStorage';
import { UIStatistic } from '../services/uiStatistic';
/** Services */
import { UIStorage } from '../services/uiStorage';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    SettingsPage,
    StatisticsPage,
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
    BrewsAddModal,
    TimerComponent,
    BrewsEditModal,
    BrewsPhotoView,
    BrewsDetailsModal,
    BrewsTableModal,
    BrewsPopover,
    BrewsTextModal,
    AboutPage,
    ThanksPage,
    ContactPage,
    LicencesPage,
    TermsPage,
    PrivacyPage
  ],

  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      scrollAssist: true,
      autoFocusAssist: false,
      platform: 'android',
      mode: 'md'
    }),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    })

  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    SettingsPage,
    StatisticsPage,
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
    BrewsPage,
    BrewsAddModal,
    TimerComponent,
    BrewsEditModal,
    BrewsPhotoView,
    BrewsDetailsModal,
    BrewsTableModal,
    BrewsPopover,
    BrewsTextModal,
    AboutPage,
    ThanksPage,
    ContactPage,
    LicencesPage,
    TermsPage,
    PrivacyPage
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
    UIBeanStorage,
    AppMinimize,
    {
      provide: ErrorHandler,
      useClass: IonicErrorHandler
    },
    Camera,
    ImagePicker,
    AndroidPermissions,
    UIBrewStorage,
    UIStatistic
  ],
  exports: [PreventCharacterDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {
}
