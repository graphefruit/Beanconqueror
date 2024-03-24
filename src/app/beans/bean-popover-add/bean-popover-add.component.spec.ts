import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanPopoverAddComponent } from './bean-popover-add.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TranslateServiceMock } from '../../../mocks';

describe('BeanPopoverAddComponent', () => {
  let component: BeanPopoverAddComponent;
  let fixture: ComponentFixture<BeanPopoverAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverAddComponent, TranslatePipe],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: TranslateService,
          useValue: TranslateServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanPopoverAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
