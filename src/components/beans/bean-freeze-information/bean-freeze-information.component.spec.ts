import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BeanFreezeInformationComponent } from './bean-freeze-information.component';
import { IonicStorageModule } from '@ionic/storage-angular';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from 'src/services/uiHelper';
import { UIHelperMock } from 'src/classes/mock';
import { PipesModule } from 'src/pipes/pipes.module';
import { Bean } from 'src/classes/bean/bean';

describe('BeanFreezeInformationComponent', () => {
  let component: BeanFreezeInformationComponent;
  let fixture: ComponentFixture<BeanFreezeInformationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [BeanFreezeInformationComponent],
      imports: [
        IonicModule.forRoot(),
        IonicStorageModule.forRoot(),
        TranslateModule.forRoot(),
        PipesModule,
        FormsModule,
      ],
      providers: [{ provide: UIHelper, useClass: UIHelperMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanFreezeInformationComponent);
    component = fixture.componentInstance;
    component.data = new Bean();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
