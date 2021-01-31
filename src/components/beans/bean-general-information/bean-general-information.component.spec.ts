import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanGeneralInformationComponent } from './bean-general-information.component';

describe('BeanGeneralInformationComponent', () => {
  let component: BeanGeneralInformationComponent;
  let fixture: ComponentFixture<BeanGeneralInformationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BeanGeneralInformationComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeanGeneralInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
