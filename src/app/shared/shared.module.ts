import {CUSTOM_ELEMENTS_SCHEMA, NgModule} from '@angular/core';

import {FormatDatePipe} from '../../pipes/formatDate';
import {KeysPipe} from '../../pipes/keys';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {AsyncImageComponent} from '../../components/async-image/async-image.component';
import {SearchPipe} from '../../pipes/search';
import {RemoveEmptyNumberDirective} from '../../directive/remove-empty-number.directive';
import {PreventCharacterDirective} from '../../directive/prevent-character.directive';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {BrewPage} from '../brew/brew.page';
import {BrewDetailComponent} from '../brew/brew-detail/brew-detail.component';
import {BrewEditComponent} from '../brew/brew-edit/brew-edit.component';
import {BrewPhotoViewComponent} from '../brew/brew-photo-view/brew-photo-view.component';
import {BrewPopoverComponent} from '../brew/brew-popover/brew-popover.component';
import {BrewTableComponent} from '../brew/brew-table/brew-table.component';
import {BrewTextComponent} from '../brew/brew-text/brew-text.component';
import {TimerComponent} from '../../components/timer/timer.component';
import {FormsModule} from '@angular/forms';
import {MillPage} from '../mill/mill.page';
import {MillEditComponent} from '../mill/mill-edit/mill-edit.component';
import {MillAddComponent} from '../mill/mill-add/mill-add.component';
import {PreparationPage} from '../preparation/preparation.page';
import {PreparationAddComponent} from '../preparation/preparation-add/preparation-add.component';
import {PreparationEditComponent} from '../preparation/preparation-edit/preparation-edit.component';
import {AboutComponent} from '../info/about/about.component';
import {ContactComponent} from '../info/contact/contact.component';
import {CreditsComponent} from '../info/credits/credits.component';
import {LicencesComponent} from '../info/licences/licences.component';
import {PrivacyComponent} from '../info/privacy/privacy.component';
import {TermsComponent} from '../info/terms/terms.component';
import {ThanksComponent} from '../info/thanks/thanks.component';
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';
import {File} from '@ionic-native/file/ngx';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {AppMinimize} from '@ionic-native/app-minimize/ngx';
import {Keyboard} from '@ionic-native/keyboard/ngx';
import {ThreeDeeTouch} from '@ionic-native/three-dee-touch/ngx';
import {Camera} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {BeansPage} from '../beans/beans.page';
import {BeansAddComponent} from '../beans/beans-add/beans-add.component';
import {BeansEditComponent} from '../beans/beans-edit/beans-edit.component';
import {HomePage} from '../home/home.page';
import {StatisticPage} from '../statistic/statistic.page';
import {SettingsPage} from '../settings/settings.page';
import {BrewPopoverActionsComponent} from '../brew/brew-popover-actions/brew-popover-actions.component';
import {LogComponent} from '../info/log/log.component';
import {LogTextComponent} from '../info/log/log-text/log-text.component';


@NgModule({
  declarations: [SettingsPage, StatisticPage, HomePage, BeansPage, BeansAddComponent, BeansEditComponent, AboutComponent,
    ContactComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    TermsComponent,
    ThanksComponent, LogComponent, LogTextComponent, PreparationPage, PreparationAddComponent,
    PreparationEditComponent, MillPage, MillEditComponent, MillAddComponent, BrewAddComponent,
    FormatDatePipe, KeysPipe, AsyncImageComponent, SearchPipe, RemoveEmptyNumberDirective,
    PreventCharacterDirective, BrewPage, BrewDetailComponent, BrewEditComponent, BrewPhotoViewComponent,
    BrewPopoverComponent, BrewPopoverActionsComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  entryComponents: [SettingsPage, StatisticPage, HomePage, BeansPage, BeansAddComponent, BeansEditComponent, AboutComponent,
    ContactComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    TermsComponent,
    ThanksComponent, LogComponent, LogTextComponent, PreparationPage,
    PreparationAddComponent, PreparationEditComponent, MillPage, MillEditComponent,
    MillAddComponent, BrewAddComponent, BrewPage, BrewDetailComponent, BrewEditComponent,
    BrewPhotoViewComponent, BrewPopoverComponent, BrewPopoverActionsComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    RemoveEmptyNumberDirective, PreventCharacterDirective, FormatDatePipe, KeysPipe,
    InAppBrowser,
    File,
    FileChooser,
    FilePath,
    IOSFilePicker,
    SocialSharing,
    AppMinimize,
    Keyboard,
    ThreeDeeTouch,
    Camera, ImagePicker, AndroidPermissions,
    InAppBrowser, File
  ],

  exports: [SettingsPage, StatisticPage, HomePage, BeansPage, BeansAddComponent, BeansEditComponent, AboutComponent,
    ContactComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    TermsComponent,
    ThanksComponent, PreparationPage, PreparationAddComponent,
    PreparationEditComponent, MillPage, MillEditComponent, MillAddComponent,
    BrewAddComponent, FormatDatePipe,
    KeysPipe, AsyncImageComponent, SearchPipe, RemoveEmptyNumberDirective,
    PreventCharacterDirective, BrewPage, BrewDetailComponent, BrewEditComponent,
    BrewPhotoViewComponent, BrewPopoverComponent, BrewPopoverActionsComponent, BrewTableComponent, BrewTextComponent, TimerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {
}
