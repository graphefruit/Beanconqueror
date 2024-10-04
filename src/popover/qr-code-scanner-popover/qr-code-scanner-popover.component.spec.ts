import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { QrCodeScannerPopoverComponent } from './qr-code-scanner-popover.component';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../classes/mock';
import { UIHelper } from '../../services/uiHelper';
import { Storage } from '@ionic/storage';

describe('QrCodeScannerPopoverComponent', () => {
  let component: QrCodeScannerPopoverComponent;
  let fixture: ComponentFixture<QrCodeScannerPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [QrCodeScannerPopoverComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QrCodeScannerPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
