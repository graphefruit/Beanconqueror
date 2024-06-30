import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewChooseGraphReferenceComponent } from './brew-choose-graph-reference.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { Brew } from '../../../classes/brew/brew';

describe('BrewChooseGraphReferenceComponent', () => {
  let component: BrewChooseGraphReferenceComponent;
  let fixture: ComponentFixture<BrewChooseGraphReferenceComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewChooseGraphReferenceComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: Storage,
        },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: FileChooser,
        },
        {
          provide: File,
        },
        {
          provide: SocialSharing,
        },
        {
          provide: FileTransfer,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BrewChooseGraphReferenceComponent);
    component = fixture.componentInstance;
    component.brew = new Brew();
    component.brews = new Array<Brew>();
    component.archivedBrewsFilter = {
      method_of_preparation: new Array<string>(),
    } as IBrewPageFilter;
    component.openBrewsFilter = {
      method_of_preparation: new Array<string>(),
    } as IBrewPageFilter;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
