import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineDetailComponent } from './roasting-machine-detail.component';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';
import { TranslateModule } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';

describe('RoastingMachineDetailComponent', () => {
  let component: RoastingMachineDetailComponent;
  let fixture: ComponentFixture<RoastingMachineDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachineDetailComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
