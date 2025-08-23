import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { HelperWaterHardnessComponent } from './helper-water-hardness.component';
import { TranslateModule } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('HelperWaterHardnessComponent', () => {
  let component: HelperWaterHardnessComponent;
  let fixture: ComponentFixture<HelperWaterHardnessComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      declarations: [HelperWaterHardnessComponent],
      providers: [],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HelperWaterHardnessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate the right german water hardness', () => {
    component.waterhardness.ca = 23;
    component.waterhardness.mg = 23;
    const germanHardness: string = component.getGermanHardness();
    expect(germanHardness).toBe('8.53');
  });
});
