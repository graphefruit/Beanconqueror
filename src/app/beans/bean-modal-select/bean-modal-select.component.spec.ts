import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanModalSelectComponent } from './bean-modal-select.component';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { Bean } from '../../../classes/bean/bean';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock } from '../../../mocks';

describe('BeanModalSelectComponent', () => {
  let component: BeanModalSelectComponent;
  let fixture: ComponentFixture<BeanModalSelectComponent>;

  beforeEach(waitForAsync(() => {
    const mockedSettings = {
      GET_BEAN_FILTER() {
        return {
          favourite: false,
          bean_roaster: [],
          bean_roasting_type: [],
          rating: {
            upper: 1,
            lower: 1,
          },
          roastingDateEnd: '',
          roastingDateStart: '',
          roast_range: {
            upper: 1,
            lower: 1,
          },
        } as IBeanPageFilter;
      },
    } as Settings;
    TestBed.configureTestingModule({
      declarations: [BeanModalSelectComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries(): Array<Bean> {
              return [];
            },
          },
        },
        {
          provide: UIBeanHelper,
          useValue: {},
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return mockedSettings;
            },
          },
        },
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
