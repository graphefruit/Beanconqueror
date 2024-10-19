import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewEditComponent } from './brew-edit.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { NavParamsMock } from '../../../classes/mock';
import { Router } from '@angular/router';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PipesModule } from 'src/pipes/pipes.module';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';

describe('BrewEditComponent', () => {
  let component: BrewEditComponent;
  let fixture: ComponentFixture<BrewEditComponent>;

  beforeEach(waitForAsync(() => {
    NavParamsMock.setParams(undefined);
    TestBed.configureTestingModule({
      declarations: [BrewEditComponent, AsyncImageComponent],
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
    fixture = TestBed.createComponent(BrewEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
