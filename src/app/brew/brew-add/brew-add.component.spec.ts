import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewAddComponent } from './brew-add.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { KeysPipe } from '../../../pipes/keys';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../../classes/mock';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Router } from '@angular/router';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { BrewTimerComponent } from '../../../components/brew-timer/brew-timer.component';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Insomnia } from '@awesome-cordova-plugins/insomnia/ngx';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { Preparation } from '../../../classes/preparation/preparation';
import { Mill } from '../../../classes/mill/mill';

describe('BrewAddComponent', () => {
  let component: BrewAddComponent;
  let fixture: ComponentFixture<BrewAddComponent>;

  beforeEach(waitForAsync(() => {
    const mockedStorage = {} as Settings;
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
      ],
      declarations: [
        BrewAddComponent,
        KeysPipe,
        FormatDatePipe,
        BrewTimerComponent,
        AsyncImageComponent,
      ],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: File },
        { provide: Camera },
        { provide: ImagePicker },
        { provide: AndroidPermissions },
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries(): Array<Bean> {
              return [];
            },
          },
        },
        {
          provide: UIPreparationStorage,
          useValue: {
            getAllEntries(): Array<Preparation> {
              return [];
            },
          },
        },
        { provide: UIBrewStorage, useValue: {} },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return mockedStorage;
            },
          },
        },
        {
          provide: UIMillStorage,
          useValue: {
            getAllEntries(): Array<Mill> {
              return [];
            },
          },
        },
        { provide: UIBrewHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: BrewTrackingService, useValue: {} },
        { provide: VisualizerService, useValue: {} },
        Geolocation,
        Insomnia,
        { provide: Router },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
