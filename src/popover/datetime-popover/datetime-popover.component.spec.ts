import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DatetimePopoverComponent } from './datetime-popover.component';

describe('DatetimePopoverComponent', () => {
  let component: DatetimePopoverComponent;
  let fixture: ComponentFixture<DatetimePopoverComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DatetimePopoverComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DatetimePopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
