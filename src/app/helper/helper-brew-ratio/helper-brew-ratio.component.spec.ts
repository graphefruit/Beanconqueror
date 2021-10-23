import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {HelperBrewRatioComponent} from './helper-brew-ratio.component';

describe('HelperBrewRatioComponent', () => {
  let component: HelperBrewRatioComponent;
  let fixture: ComponentFixture<HelperBrewRatioComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [HelperBrewRatioComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(HelperBrewRatioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
