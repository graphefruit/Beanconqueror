import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { GraphPage } from './graph.page';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';

describe('GraphPage', () => {
  let component: GraphPage;
  let fixture: ComponentFixture<GraphPage>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphPage],
      providers: [
        { provide: Storage },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        { provide: FileChooser },
        { provide: SocialSharing },
        { provide: FileTransfer },
      ],
      imports: [IonicModule.forRoot(), CommonModule, TranslateModule.forRoot()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
