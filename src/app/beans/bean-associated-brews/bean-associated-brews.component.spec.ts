import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanAssociatedBrewsComponent } from './bean-associated-brews.component';

describe('BeanAssociatedBrewsComponent', () => {
  let component: BeanAssociatedBrewsComponent;
  let fixture: ComponentFixture<BeanAssociatedBrewsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanAssociatedBrewsComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanAssociatedBrewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
