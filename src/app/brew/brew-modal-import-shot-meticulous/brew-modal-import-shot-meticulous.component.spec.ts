import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BrewModalImportShotMeticulousComponent } from './brew-modal-import-shot-meticulous.component';

describe('BrewModalImportShotMeticulousComponent', () => {
  let component: BrewModalImportShotMeticulousComponent;
  let fixture: ComponentFixture<BrewModalImportShotMeticulousComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BrewModalImportShotMeticulousComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(BrewModalImportShotMeticulousComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
