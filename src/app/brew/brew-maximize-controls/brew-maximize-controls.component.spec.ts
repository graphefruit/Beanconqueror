import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewMaximizeControlsComponent } from './brew-maximize-controls.component';

describe('BrewMaximizeControlsComponent', () => {
  let component: BrewMaximizeControlsComponent;
  let fixture: ComponentFixture<BrewMaximizeControlsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewMaximizeControlsComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewMaximizeControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
