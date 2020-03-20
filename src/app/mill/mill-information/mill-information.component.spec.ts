import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {MillInformationComponent} from './mill-information.component';

describe('MillInformationComponent', () => {
  let component: MillInformationComponent;
  let fixture: ComponentFixture<MillInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MillInformationComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(MillInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
