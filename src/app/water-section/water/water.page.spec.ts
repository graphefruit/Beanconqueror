import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterPage } from './water.page';

describe('WaterPage', () => {
  let component: WaterPage;
  let fixture: ComponentFixture<WaterPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WaterPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(WaterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
