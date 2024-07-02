import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { AssociatedBrewsComponent } from './associated-brews.component';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { TranslateModule } from '@ngx-translate/core';

describe('AssociatedBrewsComponent', () => {
  let component: AssociatedBrewsComponent;
  let fixture: ComponentFixture<AssociatedBrewsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [AssociatedBrewsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIBeanHelper,
          useValue: {},
        },
        {
          provide: UIAnalytics,
          useValue: {},
        },
        {
          provide: UIPreparationHelper,
          useValue: {},
        },
        {
          provide: UIMillHelper,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssociatedBrewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
