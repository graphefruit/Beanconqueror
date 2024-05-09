import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterInformationCardComponent } from './water-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { UIImage } from '../../services/uiImage';
import { Water } from '../../classes/water/water';

describe('WaterInformationCardComponent', () => {
  let component: WaterInformationCardComponent;
  let fixture: ComponentFixture<WaterInformationCardComponent>;

  beforeEach(() => {
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

    fixture = TestBed.createComponent(WaterInformationCardComponent);
    component = fixture.componentInstance;
    component.water = {
      name: '',
    } as Water;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
