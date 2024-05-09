import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { QrCodeScannerPopoverComponent } from './qr-code-scanner-popover.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { Storage } from '@ionic/storage';

describe('QrCodeScannerPopoverComponent', () => {
  let component: QrCodeScannerPopoverComponent;
  let fixture: ComponentFixture<QrCodeScannerPopoverComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QrCodeScannerPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QrCodeScannerPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
