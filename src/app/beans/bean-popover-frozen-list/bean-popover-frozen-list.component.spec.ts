import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeanPopoverFrozenListComponent } from './bean-popover-frozen-list.component';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UIHelperMock } from 'src/classes/mock';
import { UIHelper } from 'src/services/uiHelper';
import { IonicModule } from '@ionic/angular';

describe('BeanPopoverFrozenListComponent', () => {
  let component: BeanPopoverFrozenListComponent;
  let fixture: ComponentFixture<BeanPopoverFrozenListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverFrozenListComponent],
      imports: [
        IonicModule.forRoot(),
        IonicStorageModule.forRoot(),
        TranslateModule.forChild(),
        TranslateModule.forRoot(),
      ],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanPopoverFrozenListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
