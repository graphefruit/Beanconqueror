import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PreparationAddComponent } from './preparation-add.component';
import { TranslateModule } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import { KeysPipe } from '../../../pipes/keys';
import { UIAnalytics } from '../../../services/uiAnalytics';

describe('PreparationAddComponent', () => {
  let component: PreparationAddComponent;
  let fixture: ComponentFixture<PreparationAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [PreparationAddComponent, KeysPipe],
      providers: [
        {
          provide: UIAnalytics,
          useValue: {},
        },
        {
          provide: ModalController,
          useValue: {},
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
