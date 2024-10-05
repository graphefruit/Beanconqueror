import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { PreparationInformationCardComponent } from './preparation-information-card.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UIImage } from '../../services/uiImage';
import { Preparation } from '../../classes/preparation/preparation';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('PreparationInformationCardComponent', () => {
  let component: PreparationInformationCardComponent;
  let fixture: ComponentFixture<PreparationInformationCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationInformationCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        {
          provide: UIImage,
          useClass: UIImageMock,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationInformationCardComponent);
    component = fixture.componentInstance;
    component.preparation = new Preparation();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
