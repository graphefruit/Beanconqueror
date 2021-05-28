import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CuppingFlavorsComponent } from './cupping-flavors.component';

describe('CuppingFlavorsComponent', () => {
  let component: CuppingFlavorsComponent;
  let fixture: ComponentFixture<CuppingFlavorsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CuppingFlavorsComponent ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CuppingFlavorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
