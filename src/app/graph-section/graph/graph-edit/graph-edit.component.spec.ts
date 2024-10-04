import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { GraphEditComponent } from './graph-edit.component';
import { NavParamsMock, UIHelperMock } from '../../../../classes/mock';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
import { FormsModule } from '@angular/forms';

describe('GraphEditComponent', () => {
  let component: GraphEditComponent;
  let fixture: ComponentFixture<GraphEditComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphEditComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: NavParams, useClass: NavParamsMock },
        { provide: Storage },
        { provide: SocialSharing },
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        {
          provide: FileChooser,
        },
        {
          provide: FileTransfer,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
