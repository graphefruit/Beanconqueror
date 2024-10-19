import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ThanksComponent } from './thanks.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { NavParamsMock } from '../../../classes/mock/NavParamsMock';
import { Router } from '@angular/router';
import { PipesModule } from 'src/pipes/pipes.module';

describe('ThanksComponent', () => {
  let component: ThanksComponent;
  let fixture: ComponentFixture<ThanksComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        PipesModule,
      ],
      declarations: [ThanksComponent],
      providers: [
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: Router },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ThanksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
