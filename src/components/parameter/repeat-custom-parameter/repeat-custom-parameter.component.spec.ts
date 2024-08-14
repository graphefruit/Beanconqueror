import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RepeatCustomParameterComponent } from './repeat-custom-parameter.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { RepeatBrewParameter } from '../../../classes/parameter/repeatBrewParameter';
import { Preparation } from '../../../classes/preparation/preparation';

describe('RepeatCustomParameterComponent', () => {
  let component: RepeatCustomParameterComponent;
  let fixture: ComponentFixture<RepeatCustomParameterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RepeatCustomParameterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RepeatCustomParameterComponent);
    component = fixture.componentInstance;
    component.data = {
      repeat_coffee_parameters: {} as RepeatBrewParameter,
    } as Preparation;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
