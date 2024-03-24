import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BeanSortComponent } from './bean-sort.component';
import { NavParamsMock } from '../../../classes/mock';

describe('BeanSortComponent', () => {
  let component: BeanSortComponent;
  let fixture: ComponentFixture<BeanSortComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanSortComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanSortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
