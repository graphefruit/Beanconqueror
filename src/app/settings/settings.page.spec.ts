import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SettingsPage } from './settings.page';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../classes/mock/NavParamsMock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { FilePath } from '@awesome-cordova-plugins/file-path/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { PipesModule } from 'src/pipes/pipes.module';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        PipesModule,
      ],
      declarations: [SettingsPage],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: File },
        { provide: ImagePicker },
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Router },
        { provide: FileChooser },
        { provide: FileTransfer },
        { provide: FilePath },
        { provide: SocialSharing },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
