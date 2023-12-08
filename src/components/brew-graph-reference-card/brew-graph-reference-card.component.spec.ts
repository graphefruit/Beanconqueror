import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewGraphReferenceCardComponent } from './brew-graph-reference-card.component';

describe('BrewGraphReferenceCardComponent', () => {
  let component: BrewGraphReferenceCardComponent;
  let fixture: ComponentFixture<BrewGraphReferenceCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewGraphReferenceCardComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewGraphReferenceCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
