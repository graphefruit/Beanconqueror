import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineInformationCardComponent } from './roasting-machine-information-card.component';

describe('RoastingMachineInformationCardComponent', () => {
  let component: RoastingMachineInformationCardComponent;
  let fixture: ComponentFixture<RoastingMachineInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ RoastingMachineInformationCardComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineInformationCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
