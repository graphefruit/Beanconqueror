import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BrewCuppingComponent } from './brew-cupping.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

describe('BrewCuppingComponent', () => {
  let component: BrewCuppingComponent;
  let fixture: ComponentFixture<BrewCuppingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewCuppingComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: Storage,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewCuppingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
