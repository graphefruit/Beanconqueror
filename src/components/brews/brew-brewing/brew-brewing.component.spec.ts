// import { ComponentFixture, TestBed } from '@angular/core/testing';
// import { IonicModule } from '@ionic/angular';
//
// import { BrewBrewingComponent } from './brew-brewing.component';
// import { Storage } from '@ionic/storage';
// import { TranslateModule } from '@ngx-translate/core';
// import { UIHelperMock } from '../../../classes/mock';
// import { UIHelper } from '../../../services/uiHelper';
// import { File } from '@awesome-cordova-plugins/file/ngx';
// import { SocialSharing } from '@awesome-cordova-plugins/social-sharing/ngx';
// import { FileTransfer } from '@awesome-cordova-plugins/file-transfer/ngx';
// import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
// import { HttpClientTestingModule } from '@angular/common/http/testing';
// import { Brew } from '../../../classes/brew/brew';
// import { Preparation } from '../../../classes/preparation/preparation';
//
// describe('BrewBrewingComponent', () => {
//   let component: BrewBrewingComponent;
//   let fixture: ComponentFixture<BrewBrewingComponent>;
//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       declarations: [BrewBrewingComponent],
//       imports: [IonicModule.forRoot(), TranslateModule.forRoot(), HttpClientTestingModule],
//       providers: [
//         {
//           provide: Storage
//         },
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
//         },
//         {
//           provide: ScreenOrientation
//         }
//       ]
//     }).compileComponents();
//
//     fixture = TestBed.createComponent(BrewBrewingComponent);
//     component = fixture.componentInstance;
//     component.data = {
//       getPreparation(): Preparation {
//         return {
//           use_custom_parameters: false
//         } as Preparation;
//       },
//       config: {
//         uuid: ''
//       }
//     } as Brew;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
// Fixme code is untestable because
