import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {HelperWaterHardnessComponent} from './helper-water-hardness.component';

describe('HelperWaterHardnessComponent', () => {
  let component: HelperWaterHardnessComponent;
  let fixture: ComponentFixture<HelperWaterHardnessComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [HelperWaterHardnessComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HelperWaterHardnessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
