import {NgModule, NO_ERRORS_SCHEMA} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouteReuseStrategy} from '@angular/router';

import {IonicModule, IonicRouteStrategy} from '@ionic/angular';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {StatusBar} from '@ionic-native/status-bar/ngx';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {IonicStorageModule} from '@ionic/storage';
import {UIStorage} from '../services/uiStorage';
import {UISettingsStorage} from '../services/uiSettingsStorage';
import {UIHelper} from '../services/uiHelper';
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {File} from '@ionic-native/file/ngx';
import {UIFileHelper} from '../services/uiFileHelper';
import {UILog} from '../services/uiLog';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {UIAlert} from '../services/uiAlert';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {UIBrewStorage} from '../services/uiBrewStorage';
import {UIMillStorage} from '../services/uiMillStorage';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {AppMinimize} from '@ionic-native/app-minimize/ngx';
import {Keyboard} from '@ionic-native/keyboard/ngx';
import {ThreeDeeTouch} from '@ionic-native/three-dee-touch/ngx';
import {RemoveEmptyNumberDirective} from '../directive/remove-empty-number.directive';
import {PreventCharacterDirective} from '../directive/prevent-character.directive';
import {UIImage} from '../services/uiImage';
import {Camera} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
import {UIBrewHelper} from '../services/uiBrewHelper';
import {AsyncImageComponent} from '../components/async-image/async-image.component';
import {SharedModule} from './shared/shared.module';
import {BrewAddComponent} from './brew/brew-add/brew-add.component';
import {UIStatistic} from '../services/uiStatistic';

@NgModule({
  declarations: [AppComponent, PreventCharacterDirective, RemoveEmptyNumberDirective],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      mode:'md'}),
    IonicStorageModule.forRoot({
      name: '__baristaDB',
      driverOrder: ['indexeddb', 'sqlite', 'websql']
    }),
    AppRoutingModule,
    SharedModule,
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    Storage,
    UIStorage,
    UISettingsStorage,
    UIHelper,
    InAppBrowser,
    UIPreparationStorage,
    File,
    UIFileHelper,
    UILog,
    FileChooser,
    FilePath,
    UIAlert,
    UIBeanStorage,
    UIBrewStorage,
    UIMillStorage,
    IOSFilePicker,
    SocialSharing,
    AppMinimize,
    Keyboard,
    ThreeDeeTouch,
    UIImage, Camera, ImagePicker, AndroidPermissions, PreventCharacterDirective, RemoveEmptyNumberDirective, UIBrewHelper,
    UIHelper, InAppBrowser, File, UIFileHelper,UIStatistic

  ],
  bootstrap: [AppComponent],
  exports:[],
  schemas: [ NO_ERRORS_SCHEMA ]
})
export class AppModule {
}
