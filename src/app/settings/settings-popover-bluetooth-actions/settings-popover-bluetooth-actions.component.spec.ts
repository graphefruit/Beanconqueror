import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { SettingsPopoverBluetoothActionsComponent } from './settings-popover-bluetooth-actions.component';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';

describe('SettingsPopoverBluetoothActionsComponent', () => {
  let component: SettingsPopoverBluetoothActionsComponent;
  let fixture: ComponentFixture<SettingsPopoverBluetoothActionsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsPopoverBluetoothActionsComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsPopoverBluetoothActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
