import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DefaultCustomParameterComponent } from './default-custom-parameter.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Settings } from '../../../classes/settings/settings';

describe('DefaultCustomParameterComponent', () => {
  let component: DefaultCustomParameterComponent;
  let fixture: ComponentFixture<DefaultCustomParameterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DefaultCustomParameterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DefaultCustomParameterComponent);
    component = fixture.componentInstance;
    component.data = new Settings();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
