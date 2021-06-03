import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterEditComponent } from './water-edit.component';

describe('WaterEditComponent', () => {
  let component: WaterEditComponent;
  let fixture: ComponentFixture<WaterEditComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WaterEditComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(WaterEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
