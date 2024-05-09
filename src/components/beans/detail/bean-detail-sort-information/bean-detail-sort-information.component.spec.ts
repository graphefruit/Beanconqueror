import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { BeanDetailSortInformationComponent } from './bean-detail-sort-information.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';
import { Bean } from '../../../../classes/bean/bean';

describe('BeanDetailSortInformationComponent', () => {
  let component: BeanDetailSortInformationComponent;
  let fixture: ComponentFixture<BeanDetailSortInformationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BeanDetailSortInformationComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BeanDetailSortInformationComponent);
    component = fixture.componentInstance;
    component.data = new Bean();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
