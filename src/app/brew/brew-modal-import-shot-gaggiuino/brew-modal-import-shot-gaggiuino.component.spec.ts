import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewModalImportShotGaggiuinoComponent } from './brew-modal-import-shot-gaggiuino.component';

describe('BrewModalImportShotGaggiuinoComponent', () => {
  let component: BrewModalImportShotGaggiuinoComponent;
  let fixture: ComponentFixture<BrewModalImportShotGaggiuinoComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewModalImportShotGaggiuinoComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewModalImportShotGaggiuinoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
