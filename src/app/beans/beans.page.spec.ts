import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeansPage } from './beans.page';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IonicStorageModule } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { KeysPipe } from '../../pipes/keys';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../classes/mock/NavParamsMock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router } from '@angular/router';
import { AsyncImageComponent } from '../../components/async-image/async-image.component';
import { FormatDatePipe } from '../../pipes/formatDate';

describe('BeansPage', () => {
  let component: BeansPage;
  let fixture: ComponentFixture<BeansPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        IonicStorageModule.forRoot(),
        CommonModule,
        IonicModule,
      ],
      declarations: [BeansPage, KeysPipe, AsyncImageComponent, FormatDatePipe],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: File },
        { provide: Camera },
        { provide: ImagePicker },
        { provide: AndroidPermissions },

        { provide: Router },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
