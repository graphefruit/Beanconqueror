import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { WaterDetailComponent } from './water-detail.component';
import { UIHelper } from '../../../../services/uiHelper';
import { UIHelperMock } from '../../../../classes/mock';
import { TranslateModule } from '@ngx-translate/core';
import { Storage } from '@ionic/storage';

describe('WaterDetailComponent', () => {
  let component: WaterDetailComponent;
  let fixture: ComponentFixture<WaterDetailComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WaterDetailComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: UIHelper, useClass: UIHelperMock },
        { provide: Storage },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WaterDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
