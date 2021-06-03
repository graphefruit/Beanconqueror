import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterSectionPage } from './water-section.page';

describe('WaterSectionPage', () => {
  let component: WaterSectionPage;
  let fixture: ComponentFixture<WaterSectionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ WaterSectionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(WaterSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
