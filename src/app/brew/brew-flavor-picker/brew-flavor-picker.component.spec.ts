import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewFlavorPickerComponent } from './brew-flavor-picker.component';

describe('BrewFlavorPickerComponent', () => {
  let component: BrewFlavorPickerComponent;
  let fixture: ComponentFixture<BrewFlavorPickerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewFlavorPickerComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewFlavorPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
