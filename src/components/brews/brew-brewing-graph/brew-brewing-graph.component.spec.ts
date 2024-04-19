import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingGraphComponent } from './brew-brewing-graph.component';

describe('BrewBrewingGraphComponent', () => {
  let component: BrewBrewingGraphComponent;
  let fixture: ComponentFixture<BrewBrewingGraphComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewBrewingGraphComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewBrewingGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
