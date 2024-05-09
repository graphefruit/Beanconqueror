import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineInformationCardComponent } from './roasting-machine-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { Camera } from '@awesome-cordova-plugins/camera/ngx';
import { UIImage } from '../../services/uiImage';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';

describe('RoastingMachineInformationCardComponent', () => {
  let component: RoastingMachineInformationCardComponent;
  let fixture: ComponentFixture<RoastingMachineInformationCardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachineInformationCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: Storage,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: Camera,
        },
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineInformationCardComponent);
    component = fixture.componentInstance;
    component.roastingMachine = {
      name: '',
      config: {
        uuid: '',
      },
    } as RoastingMachine;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
