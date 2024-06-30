import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GraphDisplayCardComponent } from './graph-display-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { Storage } from '@ionic/storage';
import { BrewFlow } from '../../classes/brew/brewFlow';

describe('GraphDisplayCardComponent', () => {
  let component: GraphDisplayCardComponent;
  let fixture: ComponentFixture<GraphDisplayCardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphDisplayCardComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: File },
        { provide: SocialSharing },
        { provide: FileTransfer },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphDisplayCardComponent);
    component = fixture.componentInstance;
    component.flowProfileData = new BrewFlow();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
