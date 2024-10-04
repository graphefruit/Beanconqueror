import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeansPage } from './beans.page';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Storage } from '@ionic/storage';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
import { Router } from '@angular/router';
import { AsyncImageComponent } from '../../components/async-image/async-image.component';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import { IntentHandlerService } from '../../services/intentHandler/intent-handler.service';
import { UIBeanHelper } from '../../services/uiBeanHelper';
import { PipesModule } from 'src/pipes/pipes.module';

describe('BeansPage', () => {
  let component: BeansPage;
  let fixture: ComponentFixture<BeansPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        FormsModule,
        CommonModule,
        IonicModule,
        PipesModule,
      ],
      declarations: [BeansPage, AsyncImageComponent],
      providers: [
        { provide: InAppBrowser },
        { provide: ModalController },
        { provide: Storage },
        { provide: ImagePicker },
        { provide: Router },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: IntentHandlerService, useValue: {} },
        { provide: UIBeanHelper, useValue: {} },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeansPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
