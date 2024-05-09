import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BrewRatingComponent } from './brew-rating.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

describe('BrewRatingComponent', () => {
  let component: BrewRatingComponent;
  let fixture: ComponentFixture<BrewRatingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BrewRatingComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
