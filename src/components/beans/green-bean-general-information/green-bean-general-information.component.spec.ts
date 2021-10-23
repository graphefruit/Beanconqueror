import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GreenBeanGeneralInformationComponent } from './green-bean-general-information.component';

describe('GreenBeanGeneralInformationComponent', () => {
  let component: GreenBeanGeneralInformationComponent;
  let fixture: ComponentFixture<GreenBeanGeneralInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ GreenBeanGeneralInformationComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GreenBeanGeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
