import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeansAddComponent } from './beans-add.component';
import { TranslateModule } from '@ngx-translate/core';

import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { PipesModule } from 'src/pipes/pipes.module';

describe('BeansAddComponent', () => {
  let component: BeansAddComponent;
  let fixture: ComponentFixture<BeansAddComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSettings = {
      bean_manage_parameters: {
        bean_information: true,
      },
    } as Settings;
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        PipesModule,
      ],
      declarations: [BeansAddComponent],
      providers: [
        { provide: ModalController },
        { provide: UIBeanStorage, useValue: {} },
        { provide: ImagePicker },
        { provide: Router },
        { provide: UIHelper, useValue: {} },
        { provide: UIFileHelper, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        {
          provide: UIBeanHelper,
          useValue: {
            fieldVisible(_settingsField: boolean, _data?: any): boolean {
              return _settingsField;
            },
          } as UIBeanHelper,
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return mockedSettings;
            },
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(BeansAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
