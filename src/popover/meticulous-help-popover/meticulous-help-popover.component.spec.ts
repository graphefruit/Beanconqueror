import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MeticulousHelpPopoverComponent } from './meticulous-help-popover.component';

describe('MeticulousHelpPopoverComponent', () => {
  let component: MeticulousHelpPopoverComponent;
  let fixture: ComponentFixture<MeticulousHelpPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MeticulousHelpPopoverComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(MeticulousHelpPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
