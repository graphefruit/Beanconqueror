import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachineAddComponent } from './roasting-machine-add.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';
import { FormsModule } from '@angular/forms';

describe('RoastingMachineAddComponent', () => {
  let component: RoastingMachineAddComponent;
  let fixture: ComponentFixture<RoastingMachineAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachineAddComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RoastingMachineAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
