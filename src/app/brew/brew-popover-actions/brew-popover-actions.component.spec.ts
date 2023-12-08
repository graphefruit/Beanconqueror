import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewPopoverActionsComponent } from './brew-popover-actions.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { IonicStorageModule } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { KeysPipe } from '../../../pipes/keys';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../../classes/mock/NavParamsMock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router } from '@angular/router';

describe('BrewPopoverActionsComponent', () => {
  let component: BrewPopoverActionsComponent;
  let fixture: ComponentFixture<BrewPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        IonicStorageModule.forRoot(),
        CommonModule,
        IonicModule,
      ],
      declarations: [BrewPopoverActionsComponent, KeysPipe],
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
    fixture = TestBed.createComponent(BrewPopoverActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
