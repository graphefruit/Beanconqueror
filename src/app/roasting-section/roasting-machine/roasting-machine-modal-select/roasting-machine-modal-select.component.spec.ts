import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineModalSelectComponent } from './roasting-machine-modal-select.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';

describe('RoastingMachineModalSelectComponent', () => {
  let component: RoastingMachineModalSelectComponent;
  let fixture: ComponentFixture<RoastingMachineModalSelectComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachineModalSelectComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        {
          provide: Storage,
        },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachineModalSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
