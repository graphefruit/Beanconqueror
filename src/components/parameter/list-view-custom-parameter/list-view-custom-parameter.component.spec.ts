import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { ListViewCustomParameterComponent } from './list-view-custom-parameter.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelperMock } from '../../../classes/mock';
import { UIHelper } from '../../../services/uiHelper';
import { Settings } from '../../../classes/settings/settings';

describe('ListViewCustomParameterComponent', () => {
  let component: ListViewCustomParameterComponent;
  let fixture: ComponentFixture<ListViewCustomParameterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ListViewCustomParameterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot()],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListViewCustomParameterComponent);
    component = fixture.componentInstance;
    component.data = new Settings();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
