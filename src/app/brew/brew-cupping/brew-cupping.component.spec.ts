import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {IonicModule} from '@ionic/angular';

import {BrewCuppingComponent} from './brew-cupping.component';

describe('BrewCuppingComponent', () => {
  let component: BrewCuppingComponent;
  let fixture: ComponentFixture<BrewCuppingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewCuppingComponent],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(BrewCuppingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
