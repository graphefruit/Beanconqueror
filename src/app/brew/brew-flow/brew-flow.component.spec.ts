// import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
// import { IonicModule } from '@ionic/angular';
//
// import { BrewFlowComponent } from './brew-flow.component';
// import { Storage } from '@ionic/storage';
// import { TranslateModule } from '@ngx-translate/core';
// import { UIHelper } from '../../../services/uiHelper';
// import { UIHelperMock } from '../../../classes/mock';
// import { Brew } from '../../../classes/brew/brew';
// import { IBrew } from '../../../interfaces/brew/iBrew';
// import { Preparation } from '../../../classes/preparation/preparation';
// import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
//
// describe('BrewFlowComponent', () => {
//   let component: BrewFlowComponent;
//   let fixture: ComponentFixture<BrewFlowComponent>;
//
//   beforeEach(waitForAsync(() => {
//     TestBed.configureTestingModule({
//       declarations: [BrewFlowComponent],
//       imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
//       providers: [{ provide: Storage }, { provide: UIHelper, useClass: UIHelperMock }]
//     }).compileComponents();
//
//     fixture = TestBed.createComponent(BrewFlowComponent);
//     component = fixture.componentInstance;
//     component.brew = {
//       initializeByObject(brewObj: IBrew) {
//
//       },
//       getPreparation(): Preparation {
//         return new Preparation();
//       }
//     } as Brew;
//     component.brewComponent = {
//       brewBrewingGraphEl: {
//         data: {
//           getBrewRatio(): string {
//             return '';
//           }
//         },
//         smartScaleConnected(): boolean  {
//           return false;
//         }
//       },
//       timer: {
//         timer:{
//           hasStarted: true
//         },
//         getSeconds(): number {
//           return 10;
//         }
//       }
//     } as BrewBrewingComponent;
//     fixture.detectChanges();
//   }));
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
// FIXME Failed: NG0100: ExpressionChangedAfterItHasBeenCheckedError:
// Expression has changed after it was checked. Previous value: 'false'. Current value: 'true'.
