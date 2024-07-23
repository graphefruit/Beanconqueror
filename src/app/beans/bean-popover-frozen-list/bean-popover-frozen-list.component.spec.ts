import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanPopoverFrozenListComponent } from './bean-popover-frozen-list.component';

describe('BeanPopoverFrozenListComponent', () => {
  let component: BeanPopoverFrozenListComponent;
  let fixture: ComponentFixture<BeanPopoverFrozenListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverFrozenListComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanPopoverFrozenListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
