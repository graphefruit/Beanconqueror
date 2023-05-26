import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreparationConnectedDeviceComponent } from './preparation-connected-device.component';

describe('PreparationConnectedDeviceComponent', () => {
  let component: PreparationConnectedDeviceComponent;
  let fixture: ComponentFixture<PreparationConnectedDeviceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationConnectedDeviceComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationConnectedDeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
