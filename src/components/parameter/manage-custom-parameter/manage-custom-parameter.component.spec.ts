import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ManageCustomParameterComponent } from './manage-custom-parameter.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { Settings } from '../../../classes/settings/settings';
import { ManageBrewParameter } from '../../../classes/parameter/manageBrewParameter';

describe('ManageCustomParameterComponent', () => {
  let component: ManageCustomParameterComponent;
  let fixture: ComponentFixture<ManageCustomParameterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ManageCustomParameterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageCustomParameterComponent);
    component = fixture.componentInstance;
    component.data = {
      manage_parameters: new ManageBrewParameter(),
    } as Settings;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
