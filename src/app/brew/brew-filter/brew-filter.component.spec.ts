import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BrewFilterComponent } from './brew-filter.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';

describe('BrewFilterComponent', () => {
  let component: BrewFilterComponent;
  let fixture: ComponentFixture<BrewFilterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BrewFilterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIPreparationStorage,
          useValues: {
            getByUUID(_uuid: string): any {
              return {
                tools: new Array<string>(),
              };
            },
          } as UIPreparationStorage,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewFilterComponent);
    component = fixture.componentInstance;
    NavParamsMock.setParams({
      method_of_preparation: [],
      rating: {
        lower: 1,
      },
    } as IBrewPageFilter);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
