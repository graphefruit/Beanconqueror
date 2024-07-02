import { TestBed } from '@angular/core/testing';

import { CoffeeBluetoothDevicesService } from './coffee-bluetooth-devices.service';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { UIHelper } from '../uiHelper';
import { UIHelperMock } from '../../classes/mock';

describe('CoffeeBluetoothDevicesService', () => {
  let service: CoffeeBluetoothDevicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Storage,
        },
        {
          provide: ModalController,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
      imports: [TranslateModule.forRoot(), IonicModule.forRoot()],
    });
    service = TestBed.inject(CoffeeBluetoothDevicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
