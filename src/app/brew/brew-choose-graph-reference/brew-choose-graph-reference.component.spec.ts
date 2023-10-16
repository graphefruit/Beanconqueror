import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewChooseGraphReferenceComponent } from './brew-choose-graph-reference.component';

describe('BrewChooseGraphReferenceComponent', () => {
  let component: BrewChooseGraphReferenceComponent;
  let fixture: ComponentFixture<BrewChooseGraphReferenceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewChooseGraphReferenceComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewChooseGraphReferenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
