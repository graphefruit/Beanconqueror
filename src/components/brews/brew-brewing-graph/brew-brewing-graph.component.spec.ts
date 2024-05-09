// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// import { IonicModule } from '@ionic/angular';
//
// import { BrewBrewingGraphComponent } from './brew-brewing-graph.component';
// import { Storage } from '@ionic/storage';
// import { TranslateModule } from '@ngx-translate/core';
// import { UIHelper } from '../../../services/uiHelper';
// import { UIHelperMock } from '../../../classes/mock';
// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { File } from '@awesome-cordova-plugins/file/ngx';
// import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
// import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
// import { Brew } from '../../../classes/brew/brew';
// import { Preparation } from '../../../classes/preparation/preparation';
//
// describe('BrewBrewingGraphComponent', () => {
//   let component: BrewBrewingGraphComponent;
//   let fixture: ComponentFixture<BrewBrewingGraphComponent>;
//
//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       declarations: [BrewBrewingGraphComponent],
//       imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule],
//       providers: [{
//         provide: Storage
//       },
//         {
//           provide: UIHelper,
//           useClass: UIHelperMock
//         },
//         {
//           provide: File
//         },
//         {
//           provide: SocialSharing
//         },
//         {
//           provide: FileTransfer
//         }]
//     }).compileComponents();
//
//     fixture = TestBed.createComponent(BrewBrewingGraphComponent);
//     component = fixture.componentInstance;
//     component.data = {
//       getPreparation(): Preparation {
//         return new Preparation();
//       }
//     } as Brew;
//
//     fixture.detectChanges();
//   }));
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
// FIXME Untestable because the variables get reassigned mutliple times in methods and cant be mocked
