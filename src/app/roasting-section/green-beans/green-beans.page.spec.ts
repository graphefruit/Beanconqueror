import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GreenBeansPage } from './green-beans.page';

describe('GreenBeansPage', () => {
  let component: GreenBeansPage;
  let fixture: ComponentFixture<GreenBeansPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GreenBeansPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(GreenBeansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
