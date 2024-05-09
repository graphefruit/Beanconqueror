// mport { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// mport { IonicModule } from '@ionic/angular';

// mport { GraphDisplayCardComponent } from './graph-display-card.component';
// mport { TranslateModule } from '@ngx-translate/core';
// mport { UIHelperMock } from '../../classes/mock';
// mport { UIHelper } from '../../services/uiHelper';
// mport { File } from '@awesome-cordova-plugins/file/ngx';
// mport { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
// mport { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
// mport { Storage } from '@ionic/storage';
// mport { BrewFlow } from '../../classes/brew/brewFlow';

// escribe('GraphDisplayCardComponent', () => {
//  let component: GraphDisplayCardComponent;
//  let fixture: ComponentFixture<GraphDisplayCardComponent>;

//  beforeEach(waitForAsync(() => {
//    TestBed.configureTestingModule({
//      declarations: [GraphDisplayCardComponent],
//      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
//      providers: [{
//        provide: UIHelper,
//        useClass: UIHelperMock
//      }, { provide: File }, { provide: SocialSharing }, { provide: FileTransfer }, { provide: Storage }]
//    }).compileComponents();

//    fixture = TestBed.createComponent(GraphDisplayCardComponent);
//    component = fixture.componentInstance;
//    component.flowProfileData = new BrewFlow();
//    fixture.detectChanges();
//  }));

//  it('should create', () => {
//    expect(component).toBeTruthy();
//  });
// );
// FIXME Plotly cant be tested
