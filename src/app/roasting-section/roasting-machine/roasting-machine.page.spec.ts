import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachinePage } from './roasting-machine.page';

describe('RoastingMachinePage', () => {
  let component: RoastingMachinePage;
  let fixture: ComponentFixture<RoastingMachinePage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RoastingMachinePage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachinePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
