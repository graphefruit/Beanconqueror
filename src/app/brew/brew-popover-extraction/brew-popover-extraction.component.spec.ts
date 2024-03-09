import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewPopoverExtractionComponent } from './brew-popover-extraction.component';

describe('BrewPopoverExtractionComponent', () => {
  let component: BrewPopoverExtractionComponent;
  let fixture: ComponentFixture<BrewPopoverExtractionComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewPopoverExtractionComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewPopoverExtractionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
