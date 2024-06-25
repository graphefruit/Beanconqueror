import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewBrewingPreparationDeviceComponent } from './brew-brewing-preparation-device.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('BrewBrewingPreparationDeviceComponent', () => {
  let component: BrewBrewingPreparationDeviceComponent;
  let fixture: ComponentFixture<BrewBrewingPreparationDeviceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewBrewingPreparationDeviceComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
      ],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewBrewingPreparationDeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
