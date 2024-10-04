import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GraphDetailComponent } from './graph-detail.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';
import { Storage } from '@ionic/storage';
import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';

describe('GraphDetailComponent', () => {
  let component: GraphDetailComponent;
  let fixture: ComponentFixture<GraphDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [GraphDetailComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        {
          provide: UIHelper,
          useClass: UIHelperMock,
        },
        { provide: Storage },
        { provide: SocialSharing },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GraphDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
