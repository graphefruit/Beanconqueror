import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewChoosePreparationToBrewComponent } from './brew-choose-preparation-to-brew.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('BrewChoosePreparationToBrewComponent', () => {
  let component: BrewChoosePreparationToBrewComponent;
  let fixture: ComponentFixture<BrewChoosePreparationToBrewComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewChoosePreparationToBrewComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewChoosePreparationToBrewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
