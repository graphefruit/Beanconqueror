import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BrewEditComponent } from './brew-edit.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, NavParams } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { NavParamsMock } from '../../../classes/mock';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
import { AsyncImageComponent } from '../../../components/async-image/async-image.component';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Insomnia } from '@awesome-cordova-plugins/insomnia/ngx';
import { PipesModule } from 'src/pipes/pipes.module';

describe('BrewEditComponent', () => {
  let component: BrewEditComponent;
  let fixture: ComponentFixture<BrewEditComponent>;

  beforeEach(waitForAsync(() => {
    NavParamsMock.setParams(undefined);
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        HttpClientTestingModule,
        PipesModule,
      ],
      declarations: [BrewEditComponent, AsyncImageComponent],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: ImagePicker },
        { provide: SocialSharing },
        { provide: Router },
        { provide: FileTransfer },
        { provide: Insomnia },
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
