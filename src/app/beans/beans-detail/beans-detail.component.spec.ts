import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavParams } from '@ionic/angular';

import { BeansDetailComponent } from './beans-detail.component';
import { NavParamsMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { TranslateModule } from '@ngx-translate/core';
import { Settings } from '../../../classes/settings/settings';

describe('BeansDetailComponent', () => {
  let component: BeansDetailComponent;
  let fixture: ComponentFixture<BeansDetailComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSettings = {
      bean_manage_parameters: {
        bean_information: true,
      },
    } as Settings;
    TestBed.configureTestingModule({
      declarations: [BeansDetailComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIHelper,
          useValue: {},
        },
        {
          provide: UIAnalytics,
          useValue: {},
        },
        {
          provide: UIBeanHelper,
          useValue: {
            fieldVisible(_settingsField: boolean, _data?: any): boolean {
              return _settingsField;
            },
          },
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
    }).compileComponents();

    fixture = TestBed.createComponent(BeansDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
