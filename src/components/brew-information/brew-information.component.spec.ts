import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewInformationComponent } from './brew-information.component';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Storage } from '@ionic/storage';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock, UIImageMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { UIImage } from '../../services/uiImage';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { Brew } from '../../classes/brew/brew';
import { IBrew } from '../../interfaces/brew/iBrew';
import { Bean } from '../../classes/bean/bean';
import { Preparation } from '../../classes/preparation/preparation';
import { Mill } from '../../classes/mill/mill';
import { PipesModule } from 'src/pipes/pipes.module';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';

describe('BrewInformationComponent', () => {
  let component: BrewInformationComponent;
  let fixture: ComponentFixture<BrewInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewInformationComponent],
      imports: [
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
        HttpClientTestingModule,
        PipesModule,
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Storage },
        { provide: InAppBrowser },
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: UIImage, useClass: UIImageMock },
        { provide: SocialSharing },
        { provide: FileTransfer },
        { provide: FileChooser },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewInformationComponent);
    component = fixture.componentInstance;
    component.brew = {
      initializeByObject(brewObj: IBrew) {},
      getBean(): Bean {
        return new Bean();
      },
      getPreparation(): Preparation {
        return new Preparation();
      },
      getMill(): Mill {
        return new Mill();
      },
      config: {
        unix_timestamp: 0,
      },
      method_of_preparation_tools: new Array<string>(),
      hasCustomFlavors(): boolean {
        return false;
      },
      hasPredefinedFlavors(): boolean {
        return false;
      },
      getBrewRatio(): string {
        return '';
      },
    } as Brew;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
