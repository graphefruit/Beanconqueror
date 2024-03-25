import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { BrewCuppingComponent } from './brew-cupping.component';
import { NavParamsMock } from '../../../classes/mock';

describe('BrewCuppingComponent', () => {
  let component: BrewCuppingComponent;
  let fixture: ComponentFixture<BrewCuppingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewCuppingComponent],
      imports: [IonicModule.forRoot()],
      providers: [
        {
          provide: NavParams,
          useClass: NavParamsMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewCuppingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
