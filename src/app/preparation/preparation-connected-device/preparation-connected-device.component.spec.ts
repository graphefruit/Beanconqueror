import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreparationConnectedDeviceComponent } from './preparation-connected-device.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { Preparation } from '../../../classes/preparation/preparation';

describe('PreparationConnectedDeviceComponent', () => {
  let component: PreparationConnectedDeviceComponent;
  let fixture: ComponentFixture<PreparationConnectedDeviceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationConnectedDeviceComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        FormsModule,
        HttpClientTestingModule,
      ],
      providers: [
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PreparationConnectedDeviceComponent);
    component = fixture.componentInstance;
    component.preparation = {
      connectedPreparationDevice: {
        type: PreparationDeviceType.METICULOUS,
      },
    } as Preparation;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
