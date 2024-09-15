import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewDetailComponent } from './brew-detail.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../../classes/mock/NavParamsMock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router } from '@angular/router';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
import { PipesModule } from 'src/pipes/pipes.module';

describe('BrewDetailComponent', () => {
  let component: BrewDetailComponent;
  let fixture: ComponentFixture<BrewDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        HttpClientTestingModule,
        PipesModule,
      ],
      declarations: [BrewDetailComponent],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: File },
        { provide: ImagePicker },
        { provide: AndroidPermissions },
        { provide: SocialSharing },
        { provide: Router },
        { provide: FileTransfer },
        { provide: ScreenOrientation },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
