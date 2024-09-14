import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

import { AngularDelegate, ModalController } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Keyboard } from '@awesome-cordova-plugins/keyboard/ngx';
import { ThreeDeeTouch } from '@awesome-cordova-plugins/three-dee-touch/ngx';
import { Globalization } from '@awesome-cordova-plugins/globalization/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { AppVersion } from '@awesome-cordova-plugins/app-version/ngx';
import { IntentHandlerService } from 'src/services/intentHandler/intent-handler.service';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { UIPreparationHelper } from 'src/services/uiPreparationHelper';
import { Device } from '@awesome-cordova-plugins/device/ngx';

describe('AppComponent', () => {
  let statusBarSpy, platformReadySpy, platformSpy;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Storage },
        { provide: InAppBrowser },
        { provide: File },
        { provide: Keyboard },
        { provide: ThreeDeeTouch },
        { provide: ModalController },
        { provide: Globalization },
        { provide: AngularDelegate },
        { provide: SocialSharing },
        { provide: FileTransfer },
        { provide: AppVersion },
        { provide: IntentHandlerService, useValue: {} },
        { provide: AndroidPermissions },
        { provide: UIPreparationHelper, useValue: {} },
        { provide: Device },
      ],
      imports: [RouterTestingModule.withRoutes([]), TranslateModule.forRoot()],
    }).compileComponents();
  }));

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  /** it('should have menu labels', async () => {
    const fixture = await TestBed.createComponent(AppComponent);
    await fixture.detectChanges();
    const app = fixture.nativeElement;
    const menuItems = app.querySelectorAll('ion-label');
    expect(menuItems.length).toEqual(2);
    expect(menuItems[0].textContent).toContain('Home');
    expect(menuItems[1].textContent).toContain('List');
  });

  it('should have urls', async () => {
    const fixture = await TestBed.createComponent(AppComponent);
    await fixture.detectChanges();
    const app = fixture.nativeElement;
    const menuItems = app.querySelectorAll('ion-item');
    expect(menuItems.length).toEqual(2);
    expect(menuItems[0].getAttribute('ng-reflect-router-link')).toEqual('/home');
    expect(menuItems[1].getAttribute('ng-reflect-router-link')).toEqual('/list');
  });**/
});
