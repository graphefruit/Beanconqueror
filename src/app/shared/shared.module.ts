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
import {TimerComponent} from '../../components/timer/timer.component';
import {BrewTimerComponent} from '../../components/brew-timer/brew-timer.component';
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
import {TranslateModule} from '@ngx-translate/core';
import {Globalization} from '@ionic-native/globalization/ngx';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {EnumToArrayPipe} from '../../pipes/enumToArray';
import {FirebaseX} from '@ionic-native/firebase-x/ngx';
import {HelperPage} from '../helper/helper.page';
import {BrewInformationComponent} from '../../components/brew-information/brew-information.component';
import {CuppingRadarComponent} from '../../components/cupping-radar/cupping-radar.component';
import {TooltipDirective} from '../../directive/tooltip.directive';
import {DashboardPage} from '../dashboard/dashboard.page';
import {BrewDashboardInformationComponent} from '../../components/brew-dashboard-information/brew-dashboard-information.component';
import {BeanInformationComponent} from '../../components/bean-information/bean-information.component';
import {BeanPopoverActionsComponent} from '../beans/bean-popover-actions/bean-popover-actions.component';
import {PreparationPopoverActionsComponent} from '../preparation/preparation-popover-actions/preparation-popover-actions.component';
import {PreparationInformationCardComponent} from '../../components/preparation-information-card/preparation-information-card.component';
import {MillInformationCardComponent} from '../../components/mill-information-card/mill-information-card.component';
import {MillPopoverActionsComponent} from '../mill/mill-popover-actions/mill-popover-actions.component';
import {BrewFilterComponent} from '../brew/brew-filter/brew-filter.component';
import {HelperBrewRatioComponent} from '../helper/helper-brew-ratio/helper-brew-ratio.component';
import {HelperWaterHardnessComponent} from '../helper/helper-water-hardness/helper-water-hardness.component';
import {BrewParameterPage} from '../brew-parameter/brew-parameter.page';
import {SortParameterComponent} from '../brew-parameter/sort-parameter/sort-parameter.component';
import {ManageParameterComponent} from '../brew-parameter/manage-parameter/manage-parameter.component';
import {DefaultParameterComponent} from '../brew-parameter/default-parameter/default-parameter.component';
import {InfoComponent} from '../info/info.component';
import {RouterModule} from '@angular/router';
import {CustomPopoverComponent} from '../../popover/custom-popover/custom-popover.component';
import {WelcomePopoverComponent} from '../../popover/welcome-popover/welcome-popover.component';
import {PreparationAddTypeComponent} from '../preparation/preparation-add-type/preparation-add-type.component';
import {BeanOverlayDirective} from '../../directive/bean-overlay.directive';
import {BeanModalSelectComponent} from '../beans/bean-modal-select/bean-modal-select.component';
import {BeanPhotoViewComponent} from '../beans/bean-photo-view/bean-photo-view.component';
import {MillModalSelectComponent} from '../mill/mill-modal-select/mill-modal-select.component';
import {PreparationModalSelectComponent} from '../preparation/preparation-modal-select/preparation-modal-select.component';
import {MillOverlayDirective} from '../../directive/mill-overlay.directive';
import {PreparationOverlayDirective} from '../../directive/preparation-overlay.directive';
import {DisableDoubleClickDirective} from '../../directive/disable-double-click.directive';
import {NgxStarsModule} from 'ngx-stars';
import {BrewCuppingComponent} from '../brew/brew-cupping/brew-cupping.component';
import {DatePicker} from '@ionic-native/date-picker/ngx';
import {Geolocation} from '@ionic-native/geolocation/ngx';
import {UpdatePopoverComponent} from '../../popover/update-popover/update-popover.component';

@NgModule({
  declarations: [SettingsPage, StatisticPage, HomePage, BrewParameterPage, DashboardPage, BeansPage, HelperPage, BeansAddComponent, BeansEditComponent, AboutComponent,
    ContactComponent,
    InfoComponent,
    PreparationAddTypeComponent,
    CustomPopoverComponent,
    WelcomePopoverComponent,
    UpdatePopoverComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    DefaultParameterComponent,
    SortParameterComponent,
    ManageParameterComponent,
    HelperBrewRatioComponent,
    HelperWaterHardnessComponent,
    BrewCuppingComponent,
    TermsComponent,
    ThanksComponent, LogComponent, LogTextComponent, PreparationPage, PreparationAddComponent,
    PreparationEditComponent, MillPage, MillEditComponent, BrewFilterComponent, MillAddComponent, BrewAddComponent,
    FormatDatePipe, KeysPipe, EnumToArrayPipe, AsyncImageComponent, BrewInformationComponent, BeanInformationComponent, BrewDashboardInformationComponent, PreparationInformationCardComponent, MillInformationCardComponent, CuppingRadarComponent, SearchPipe, RemoveEmptyNumberDirective,
    PreventCharacterDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    PreparationOverlayDirective,
    TooltipDirective,
    DisableDoubleClickDirective,
    BrewPage, BrewDetailComponent, BrewEditComponent, BrewPhotoViewComponent, BeanPhotoViewComponent,
    BrewPopoverActionsComponent, BeanPopoverActionsComponent, MillPopoverActionsComponent, BeanModalSelectComponent,
    MillModalSelectComponent,
    PreparationModalSelectComponent,
    PreparationPopoverActionsComponent, TimerComponent, BrewTimerComponent],
  entryComponents: [
    SettingsPage, StatisticPage, HomePage, BrewParameterPage, DashboardPage, BeansPage, HelperPage, BeansAddComponent, BeansEditComponent, BrewFilterComponent, PreparationInformationCardComponent, MillInformationCardComponent, AboutComponent,
    ContactComponent,
    InfoComponent,
    PreparationAddTypeComponent,
    CustomPopoverComponent,
    WelcomePopoverComponent,
    UpdatePopoverComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    DefaultParameterComponent,
    SortParameterComponent,
    ManageParameterComponent,
    HelperBrewRatioComponent,
    HelperWaterHardnessComponent,
    BrewCuppingComponent,
    TermsComponent,
    ThanksComponent, LogComponent, LogTextComponent, PreparationPage,
    PreparationAddComponent, PreparationEditComponent, MillPage, MillEditComponent,
    MillAddComponent, BrewAddComponent, BrewPage, BrewDetailComponent, BrewEditComponent,
    BrewPhotoViewComponent, BeanPhotoViewComponent, BrewPopoverActionsComponent, BeanPopoverActionsComponent,
    BeanModalSelectComponent,
    MillModalSelectComponent,
    PreparationModalSelectComponent,
    MillPopoverActionsComponent, PreparationPopoverActionsComponent, TimerComponent, BrewTimerComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    TranslateModule,
    RouterModule,
    NgxStarsModule,
  ],
  providers: [
    AppVersion,
    StatusBar,
    SplashScreen,
    RemoveEmptyNumberDirective, PreventCharacterDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    PreparationOverlayDirective,
    TooltipDirective,
    DisableDoubleClickDirective,
    FormatDatePipe, KeysPipe, EnumToArrayPipe,
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
    InAppBrowser, File, Globalization, FirebaseX,
    DatePicker,
    Geolocation
  ],

  exports: [SettingsPage, StatisticPage, HomePage, BrewParameterPage, BeansPage, HelperPage, BeansAddComponent, BeansEditComponent, AboutComponent,
    ContactComponent,
    InfoComponent,
    PreparationAddTypeComponent,
    CustomPopoverComponent,
    WelcomePopoverComponent,
    UpdatePopoverComponent,
    CreditsComponent,
    LicencesComponent,
    PrivacyComponent,
    DefaultParameterComponent,
    SortParameterComponent,
    ManageParameterComponent,
    HelperBrewRatioComponent,
    HelperWaterHardnessComponent,
    BrewCuppingComponent,
    TermsComponent,
    ThanksComponent, PreparationPage, PreparationAddComponent,
    PreparationEditComponent, BrewFilterComponent, MillPage, MillEditComponent, MillAddComponent,
    BrewAddComponent, FormatDatePipe,
    KeysPipe, EnumToArrayPipe, AsyncImageComponent, BrewInformationComponent, BeanInformationComponent, BrewDashboardInformationComponent, PreparationInformationCardComponent, MillInformationCardComponent, CuppingRadarComponent, SearchPipe, RemoveEmptyNumberDirective,
    PreventCharacterDirective,
    BeanOverlayDirective,
    MillOverlayDirective,
    PreparationOverlayDirective,
    TooltipDirective,
    DisableDoubleClickDirective,
    BrewPage, BrewDetailComponent, BrewEditComponent,
    BrewPhotoViewComponent, BeanPhotoViewComponent, BrewPopoverActionsComponent, BeanPopoverActionsComponent,
    BeanModalSelectComponent,
    MillModalSelectComponent,
    PreparationModalSelectComponent,
    MillPopoverActionsComponent, PreparationPopoverActionsComponent, TimerComponent, BrewTimerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SharedModule {
}
