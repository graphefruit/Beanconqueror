import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule, NavParams } from '@ionic/angular';

import { PreparationAddTypeComponent } from './preparation-add-type.component';
import { Storage } from '@ionic/storage';
import { TranslateModule } from '@ngx-translate/core';
import { UIHelper } from '../../../services/uiHelper';
import { NavParamsMock, UIHelperMock } from '../../../classes/mock';
import { FormsModule } from '@angular/forms';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PreparationAddTypeComponent', () => {
  let component: PreparationAddTypeComponent;
  let fixture: ComponentFixture<PreparationAddTypeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [PreparationAddTypeComponent],
    imports: [IonicModule.forRoot(),
        TranslateModule.forRoot(),
        FormsModule],
    providers: [
        { provide: Storage },
        {
            provide: UIHelper,
            useClass: UIHelperMock,
        },
        {
            provide: NavParams,
            useClass: NavParamsMock,
        },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PreparationAddTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
