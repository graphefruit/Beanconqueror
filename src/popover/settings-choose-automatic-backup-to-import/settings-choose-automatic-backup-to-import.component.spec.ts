import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { SettingsChooseAutomaticBackupToImportComponent } from './settings-choose-automatic-backup-to-import.component';

describe('SettingsChooseAutomaticBackupToImportComponent', () => {
  let component: SettingsChooseAutomaticBackupToImportComponent;
  let fixture: ComponentFixture<SettingsChooseAutomaticBackupToImportComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsChooseAutomaticBackupToImportComponent],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(
      SettingsChooseAutomaticBackupToImportComponent,
    );
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
