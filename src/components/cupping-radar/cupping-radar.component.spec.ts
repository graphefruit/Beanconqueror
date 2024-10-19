import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CuppingRadarComponent } from './cupping-radar.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../services/uiHelper';
import { UIHelperMock } from '../../classes/mock';
import { Chart, registerables } from 'chart.js';

describe('CuppingRadarComponent', () => {
  let component: CuppingRadarComponent;
  let fixture: ComponentFixture<CuppingRadarComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [CuppingRadarComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    Chart.register(...registerables);
    fixture = TestBed.createComponent(CuppingRadarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.chartEl = 'hello';
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
