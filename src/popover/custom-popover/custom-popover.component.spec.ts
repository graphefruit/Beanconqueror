import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { CustomPopoverComponent } from './custom-popover.component';
import { NavParamsMock } from '../../classes/mock';
import { TranslateModule } from '@ngx-translate/core';

describe('CustomPopoverComponent', () => {
  let component: CustomPopoverComponent;
  let fixture: ComponentFixture<CustomPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CustomPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
