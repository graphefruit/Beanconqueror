import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineModalSelectComponent } from './roasting-machine-modal-select.component';

describe('RoastingMachineModalSelectComponent', () => {
  let component: RoastingMachineModalSelectComponent;
  let fixture: ComponentFixture<RoastingMachineModalSelectComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RoastingMachineModalSelectComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
