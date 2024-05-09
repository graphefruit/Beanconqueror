import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RoastingMachinePage } from './roasting-machine.page';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIHelperMock } from '../../../classes/mock';

describe('RoastingMachinePage', () => {
  let component: RoastingMachinePage;
  let fixture: ComponentFixture<RoastingMachinePage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RoastingMachinePage],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoastingMachinePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
