import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BeansInformationComponent} from './beans-information.component';

describe('BeansInformationComponent', () => {
  let component: BeansInformationComponent;
  let fixture: ComponentFixture<BeansInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BeansInformationComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeansInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
