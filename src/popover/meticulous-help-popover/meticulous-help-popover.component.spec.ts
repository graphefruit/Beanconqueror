import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { MeticulousHelpPopoverComponent } from './meticulous-help-popover.component';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from 'src/services/uiHelper';
import { UIHelperMock } from 'src/classes/mock';

describe('', () => {
  let component: MeticulousHelpPopoverComponent;
  let fixture: ComponentFixture<MeticulousHelpPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [MeticulousHelpPopoverComponent],
      imports: [
        IonicModule.forRoot(),
        IonicStorageModule.forRoot(),
        // TranslateModule.forChild(),
        TranslateModule.forRoot(),
      ],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MeticulousHelpPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
