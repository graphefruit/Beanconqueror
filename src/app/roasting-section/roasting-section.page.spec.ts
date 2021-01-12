import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingSectionPage } from './roasting-section.page';

describe('RoastingSectionPage', () => {
  let component: RoastingSectionPage;
  let fixture: ComponentFixture<RoastingSectionPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RoastingSectionPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingSectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
