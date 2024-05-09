// import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { TestBed, waitForAsync } from '@angular/core/testing';
//
// import { IonicModule, ModalController, Platform } from '@ionic/angular';
// import { SplashScreen } from '@awesome-cordova-plugins/splash-screen/ngx';
// import { StatusBar } from '@awesome-cordova-plugins/status-bar/ngx';
// import { RouterTestingModule } from '@angular/router/testing';
//
// import { AppComponent } from './app.component';
// import { TranslateModule } from '@ngx-translate/core';
// import { Storage } from '@ionic/storage';
// import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
// import { File } from '@awesome-cordova-plugins/file/ngx';
// import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
// import { ThreeDeeTouch } from '@awesome-cordova-plugins/three-dee-touch/ngx';
// import { Globalization } from '@awesome-cordova-plugins/globalization/ngx';
// import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
// import { UIHelper } from '../services/uiHelper';
// import { UIHelperMock } from '../classes/mock';
// import { AppVersion } from '@awesome-cordova-plugins/app-version/ngx';
// import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
// import { Deeplinks } from '@awesome-cordova-plugins/deeplinks/ngx';
// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
// import { Device } from '@awesome-cordova-plugins/device/ngx';
//
// describe('AppComponent', () => {
//   let statusBarSpy: any, splashScreenSpy: any, platformReadySpy: Promise<any>, app: any;
//
//   beforeEach(waitForAsync(() => {
//     statusBarSpy = jasmine.createSpyObj('StatusBar', ['styleDefault', 'show']);
//     splashScreenSpy = jasmine.createSpyObj('SplashScreen', ['hide']);
//     platformReadySpy = Promise.resolve(undefined);
//     TestBed.configureTestingModule({
//       declarations: [AppComponent],
//       schemas: [CUSTOM_ELEMENTS_SCHEMA],
//       providers: [
//         { provide: StatusBar, useValue: statusBarSpy },
//         { provide: SplashScreen, useValue: splashScreenSpy },
//         {
//           provide: Platform, useValue: {
//             ready: () => platformReadySpy,
//             is: () => true,
//             backButton: {
//               subscribeWithPriority: (prio: any, callback: any) => {
//               }
//             }
//           }
//         },
//         { provide: Storage },
//         { provide: InAppBrowser },
//         { provide: File },
//         { provide: Keyboard },
//         { provide: ThreeDeeTouch },
//         { provide: ModalController },
//         { provide: Globalization },
//         { provide: SocialSharing },
//         { provide: UIHelper, useClass: UIHelperMock },
//         { provide: AppVersion },
//         { provide: FileTransfer },
//         { provide: Deeplinks },
//         { provide: AndroidPermissions },
//         { provide: Device, useValue: {} }
//       ],
//       imports: [RouterTestingModule.withRoutes([]), TranslateModule.forRoot(), IonicModule.forRoot(), HttpClientTestingModule]
//     }).compileComponents();
//     const fixture = TestBed.createComponent(AppComponent);
//     app = fixture.debugElement.componentInstance;
//     fixture.detectChanges();
//   }));
//
//   it('should create the app', async () => {
//     expect(app).toBeTruthy();
//   });
//
//   /**it('should initialize the app', async () => {
//    TestBed.createComponent(AppComponent);
//    expect(platformSpy.ready).toHaveBeenCalled();
//    await platformReadySpy;
//    expect(statusBarSpy.styleDefault).toHaveBeenCalled();
//    expect(splashScreenSpy.hide).toHaveBeenCalled();
//    });**/
//
//   /** it('should have menu labels', async () => {
//    const fixture = await TestBed.createComponent(AppComponent);
//    await fixture.detectChanges();
//    const app = fixture.nativeElement;
//    const menuItems = app.querySelectorAll('ion-label');
//    expect(menuItems.length).toEqual(2);
//    expect(menuItems[0].textContent).toContain('Home');
//    expect(menuItems[1].textContent).toContain('List');
//    });
//
//    it('should have urls', async () => {
//    const fixture = await TestBed.createComponent(AppComponent);
//    await fixture.detectChanges();
//    const app = fixture.nativeElement;
//    const menuItems = app.querySelectorAll('ion-item');
//    expect(menuItems.length).toEqual(2);
//    expect(menuItems[0].getAttribute('ng-reflect-router-link')).toEqual('/home');
//    expect(menuItems[1].getAttribute('ng-reflect-router-link')).toEqual('/list');
//    });**/
// });
// FIXME app component cant be tested because of cordova
