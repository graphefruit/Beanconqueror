import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewChoosePreparationToBrewComponent } from './brew-choose-preparation-to-brew.component';

describe('BrewChoosePreparationToBrewComponent', () => {
  let component: BrewChoosePreparationToBrewComponent;
  let fixture: ComponentFixture<BrewChoosePreparationToBrewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewChoosePreparationToBrewComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewChoosePreparationToBrewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
