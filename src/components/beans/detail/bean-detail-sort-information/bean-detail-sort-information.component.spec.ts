import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanDetailSortInformationComponent } from './bean-detail-sort-information.component';

describe('BeanDetailSortInformationComponent', () => {
  let component: BeanDetailSortInformationComponent;
  let fixture: ComponentFixture<BeanDetailSortInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ BeanDetailSortInformationComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BeanDetailSortInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
