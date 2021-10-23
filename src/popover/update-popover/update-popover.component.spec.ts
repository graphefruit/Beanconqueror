import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {UpdatePopoverComponent} from './update-popover.component';

describe('UpdatePopoverComponent', () => {
  let component: UpdatePopoverComponent;
  let fixture: ComponentFixture<UpdatePopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ UpdatePopoverComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdatePopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
