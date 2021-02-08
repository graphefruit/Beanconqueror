import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingComponent } from './brew-brewing.component';

describe('BrewBrewingComponent', () => {
  let component: BrewBrewingComponent;
  let fixture: ComponentFixture<BrewBrewingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BrewBrewingComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewBrewingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
