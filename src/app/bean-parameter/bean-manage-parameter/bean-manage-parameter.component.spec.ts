import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BeanManageParameterComponent } from './bean-manage-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock } from '../../../classes/mock';

describe('BeanManageParameterComponent', () => {
  let component: BeanManageParameterComponent;
  let fixture: ComponentFixture<BeanManageParameterComponent>;

  beforeEach(waitForAsync(() => {
    const settingsMock = {
      bean_manage_parameters: {
        name: true,
      },
    } as Settings;

    TestBed.configureTestingModule({
      declarations: [BeanManageParameterComponent, TranslatePipe],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings: (): Settings => {
              return settingsMock;
            },
          },
        },
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanManageParameterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
