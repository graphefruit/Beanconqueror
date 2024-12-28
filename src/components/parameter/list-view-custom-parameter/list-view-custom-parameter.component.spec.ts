import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
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

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ListViewCustomParameterComponent],
      imports: [IonicModule.forRoot(), TranslateModule.forRoot(), FormsModule],
      providers: [
        { provide: Storage },
        { provide: UIHelper, useClass: UIHelperMock },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ListViewCustomParameterComponent);
    component = fixture.componentInstance;
    component.data = new Settings();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
