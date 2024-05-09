// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// import { IonicModule } from '@ionic/angular';
//
// import { BrewMaximizeControlsComponent } from './brew-maximize-controls.component';
// import { ScreenOrientation } from '@awesome-cordova-plugins/screen-orientation/ngx';
// import { UIHelper } from '../../../services/uiHelper';
// import { UIHelperMock } from '../../../classes/mock';
// import { Storage } from '@ionic/storage';
// import { TranslateModule } from '@ngx-translate/core';
// import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
// import { Preparation } from '../../../classes/preparation/preparation';
//
// describe('BrewMaximizeControlsComponent', () => {
//   let component: BrewMaximizeControlsComponent;
//   let fixture: ComponentFixture<BrewMaximizeControlsComponent>;
//
//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       declarations: [BrewMaximizeControlsComponent],
//       imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
//       providers: [{ provide: ScreenOrientation }, { provide: UIHelper, useClass: UIHelperMock }, { provide: Storage }]
//     }).compileComponents();
//
//     fixture = TestBed.createComponent(BrewMaximizeControlsComponent);
//     component = fixture.componentInstance;
//     component.brewComponent = {
//       timer: {
//         timer: {
//           runTimer: false,
//         },
//         getSeconds(): number {
//           return 10;
//         },
//       },
//       getPreparation(): Preparation {
//         return new Preparation();
//       }
//     } as BrewBrewingComponent;
//     fixture.detectChanges();
//   }));
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
// Fixme ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value:
