import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavParams } from '@ionic/angular';

import { BrewRatingComponent } from './brew-rating.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

describe('BrewRatingComponent', () => {
  let component: BrewRatingComponent;
  let fixture: ComponentFixture<BrewRatingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewRatingComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
