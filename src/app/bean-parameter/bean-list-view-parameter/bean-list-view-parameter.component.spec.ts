import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanListViewParameterComponent } from './bean-list-view-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Settings } from '../../../classes/settings/settings';
import { TranslateServiceMock } from '../../../mocks/translate-service-mock';

describe('BeanListViewParameterComponent', () => {
  let component: BeanListViewParameterComponent;
  let fixture: ComponentFixture<BeanListViewParameterComponent>;

  beforeEach(waitForAsync(() => {
    const settingsMock = {
      bean_visible_list_view_parameters: {
        name: true,
      },
    } as Settings;

    TestBed.configureTestingModule({
      declarations: [BeanListViewParameterComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
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
    fixture = TestBed.createComponent(BeanListViewParameterComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
