import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PreparationAddComponent } from './preparation-add.component';
import { TranslateModule } from '@ngx-translate/core';
import { ModalController } from '@ionic/angular';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { PipesModule } from 'src/pipes/pipes.module';

describe('PreparationAddComponent', () => {
  let component: PreparationAddComponent;
  let fixture: ComponentFixture<PreparationAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), PipesModule],
      declarations: [PreparationAddComponent],
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
