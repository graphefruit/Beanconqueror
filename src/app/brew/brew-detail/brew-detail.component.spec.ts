import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewDetailComponent } from './brew-detail.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { NavParamsMock } from '../../../classes/mock/NavParamsMock';
import { Router } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from 'src/pipes/pipes.module';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('BrewDetailComponent', () => {
  let component: BrewDetailComponent;
  let fixture: ComponentFixture<BrewDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewDetailComponent],
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        PipesModule,
      ],
      providers: [
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: Router },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
