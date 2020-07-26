import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BrewFilterComponent} from './brew-filter.component';

describe('BrewFilterComponent', () => {
  let component: BrewFilterComponent;
  let fixture: ComponentFixture<BrewFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BrewFilterComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
