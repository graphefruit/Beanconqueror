import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanPopoverFreezeComponent } from './bean-popover-freeze.component';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from 'src/services/uiHelper';
import { UIHelperMock } from 'src/classes/mock';
import { PipesModule } from 'src/pipes/pipes.module';
import { Bean } from 'src/classes/bean/bean';

describe('BeanPopoverFreezeComponent', () => {
  let component: BeanPopoverFreezeComponent;
  let fixture: ComponentFixture<BeanPopoverFreezeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanPopoverFreezeComponent],
      imports: [
        IonicModule.forRoot(),
        IonicStorageModule.forRoot(),
        TranslateModule.forChild(),
        TranslateModule.forRoot(),
        PipesModule,
      ],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanPopoverFreezeComponent);
    component = fixture.componentInstance;
    component.bean = new Bean();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
