import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BeanFilterComponent } from './bean-filter.component';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock } from '../../../classes/mock';
import { FormsModule } from '@angular/forms';
import { KeysPipe } from '../../../pipes/keys';

describe('BeanFilterComponent', () => {
  let component: BeanFilterComponent;
  let fixture: ComponentFixture<BeanFilterComponent>;

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
      declarations: [BeanFilterComponent, TranslatePipe, KeysPipe],
      imports: [IonicModule.forRoot(), FormsModule],
      providers: [
        {
          provide: UIHelper,
          useValue: {
            copyData(_value: any): any {
              return _value;
            },
            toFixedIfNecessary(value: number, _dp: any): number {
              return value;
            },
          },
        },
        {
          provide: NavParams,
          useValue: {
            get(_param: string): IBeanPageFilter {
              return mockedSettings.GET_BEAN_FILTER();
            },
          },
        },
        {
          provide: UISettingsStorage,
          useValue: {
            getSettings(): Settings {
              return mockedSettings;
            },
          } as UISettingsStorage,
        },
        {
          provide: UIPreparationStorage,
          useValue: {
            getAllEntries(): Array<any> {
              return [];
            },
          },
        },
        {
          provide: UIBeanStorage,
          useValue: {
            getAllEntries(): Array<any> {
              return [];
            },
          },
        },
        {
          provide: UIMillStorage,
          useValue: {
            getAllEntries(): Array<any> {
              return [];
            },
          },
        },
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
