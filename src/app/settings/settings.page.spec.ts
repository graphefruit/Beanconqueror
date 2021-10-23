import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {SettingsPage} from './settings.page';
import {TranslateModule} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';
import {IonicStorageModule} from '@ionic/storage';
import {CommonModule} from '@angular/common';
import {IonicModule, ModalController, NavParams} from '@ionic/angular';
import {KeysPipe} from '../../pipes/keys';
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';
import {NavParamsMock} from '../../classes/mock/NavParamsMock';
import {File} from '@ionic-native/file/ngx';
import {Camera} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
;
import {Router} from '@angular/router';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';

describe('SettingsPage', () => {
  let component: SettingsPage;
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), FormsModule, IonicStorageModule.forRoot(), CommonModule, IonicModule],
      declarations: [SettingsPage, KeysPipe],
      providers: [
        {provide: InAppBrowser},
        {provide: ModalController},
        {provide: NavParams, useClass: NavParamsMock},
        {provide: Storage},
        {provide: File},
        {provide: Camera},
        {provide: ImagePicker},
        {provide: AndroidPermissions},

        {provide: Router},
        {provide: FileChooser},
        {provide: FilePath},
        {provide: IOSFilePicker},
        {provide: SocialSharing},
      ],
    })
    .compileComponents();
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
