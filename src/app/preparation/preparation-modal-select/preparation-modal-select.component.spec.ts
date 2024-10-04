import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { PreparationModalSelectComponent } from './preparation-modal-select.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PreparationModalSelectComponent', () => {
  let component: PreparationModalSelectComponent;
  let fixture: ComponentFixture<PreparationModalSelectComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PreparationModalSelectComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
        FormsModule,
      ],
      providers: [
        {
          provide: Storage,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
