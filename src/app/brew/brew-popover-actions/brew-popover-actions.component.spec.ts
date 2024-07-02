import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewPopoverActionsComponent } from './brew-popover-actions.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { KeysPipe } from '../../../pipes/keys';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../../classes/mock/NavParamsMock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';

describe('BrewPopoverActionsComponent', () => {
  let component: BrewPopoverActionsComponent;
  let fixture: ComponentFixture<BrewPopoverActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
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
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: UIPreparationStorage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewPopoverActionsComponent);
    component = fixture.componentInstance;
    component.data = {
      getPreparation(): Preparation {
        return new Preparation();
      },
      attachments: new Array<string>(),
      customInformation: {
        visualizer_id: '',
      },
    } as Brew;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
