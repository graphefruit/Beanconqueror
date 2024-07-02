import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterInformationCardComponent } from './water-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { Water } from '../../classes/water/water';
import { WATER_TYPES } from 'src/enums/water/waterTypes';

describe('WaterInformationCardComponent', () => {
  let component: WaterInformationCardComponent;
  let fixture: ComponentFixture<WaterInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WaterInformationCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: UIImage,
          useValue: {
            viewPhotos: (_data: any) => {},
          },
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaterInformationCardComponent);
    component = fixture.componentInstance;
    component.water = {
      name: '',
      type: WATER_TYPES.CUSTOM_WATER, // For getIcon() to return
    } as Water;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
