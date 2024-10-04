import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewAddComponent } from './brew-add.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
import { BrewTimerComponent } from '../../../components/brew-timer/brew-timer.component';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Insomnia } from '@awesome-cordova-plugins/insomnia/ngx';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { Preparation } from '../../../classes/preparation/preparation';
import { Mill } from '../../../classes/mill/mill';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { UIHelper } from '../../../services/uiHelper';
import { PipesModule } from 'src/pipes/pipes.module';

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
        PipesModule,
      ],
      declarations: [BrewAddComponent, BrewTimerComponent, AsyncImageComponent],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: ImagePicker },
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
        Insomnia,
        { provide: Router },
        { provide: SocialSharing },
        { provide: UIHelper, useClass: UIHelperMock },
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
