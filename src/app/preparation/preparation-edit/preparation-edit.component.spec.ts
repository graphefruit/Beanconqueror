import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PreparationEditComponent } from './preparation-edit.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { Router } from '@angular/router';
import { UIHelper } from '../../../services/uiHelper';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PipesModule } from 'src/pipes/pipes.module';

describe('PreparationEditComponent', () => {
  let component: PreparationEditComponent;
  let fixture: ComponentFixture<PreparationEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        HttpClientTestingModule,
        PipesModule,
      ],
      declarations: [PreparationEditComponent],
      providers: [
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Router },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
