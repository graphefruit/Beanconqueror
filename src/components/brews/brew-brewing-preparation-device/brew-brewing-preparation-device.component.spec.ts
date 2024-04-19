import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingPreparationDeviceComponent } from './brew-brewing-preparation-device.component';

describe('BrewBrewingPreparationDeviceComponent', () => {
  let component: BrewBrewingPreparationDeviceComponent;
  let fixture: ComponentFixture<BrewBrewingPreparationDeviceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewBrewingPreparationDeviceComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewBrewingPreparationDeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
