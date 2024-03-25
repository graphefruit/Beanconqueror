import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeansEditComponent } from './beans-edit.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { KeysPipe } from '../../../pipes/keys';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router } from '@angular/router';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

describe('BeansEditComponent', () => {
  let component: BeansEditComponent;
  let fixture: ComponentFixture<BeansEditComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSettings = {} as Settings;
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
      ],
      declarations: [BeansEditComponent, KeysPipe, AsyncImageComponent],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: Storage },
        { provide: File },
        { provide: Camera },
        { provide: ImagePicker },
        { provide: AndroidPermissions },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIBeanHelper, useValue: {} },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return mockedSettings;
            },
          },
        },
        { provide: Router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeansEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
